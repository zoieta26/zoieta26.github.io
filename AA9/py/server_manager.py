"""Controle concorrente dos receptores TCP/UDP; utilizado por server.py."""
import asyncio
import logging
from datetime import datetime, timezone

MAX_MESSAGE = 4096


class UDPReceiver(asyncio.DatagramProtocol):
    def __init__(self, manager):
        self.manager = manager

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, address):
        if self.manager.running:
            self.manager.publish("UDP", data[:MAX_MESSAGE], address)
            self.transport.sendto(b"OK UDP", address)

    def error_received(self, error):
        logging.warning("UDP: %s", error)


class ServerManager:
    def __init__(self, publish, host="0.0.0.0", tcp_port=8080, udp_port=8081):
        self.publish_callback = publish
        self.host, self.tcp_port, self.udp_port = host, tcp_port, udp_port
        self.tcp = self.udp = None
        self.clients = set()
        self.lock = asyncio.Lock()
        self.running = False

    def status(self, success=True, message=None):
        return {"type": "status", "success": success,
                "message": message or ("Servidor online" if self.running else "Servidor offline"),
                "server_status": "running" if self.running else "stopped"}

    def publish(self, protocol, data, address):
        event = {"type": "message", "protocol": protocol, "ip": address[0],
                 "port": address[1], "message": data.decode("utf-8", errors="replace"),
                 "timestamp": datetime.now(timezone.utc).isoformat()}
        logging.info("%s %s:%s %s", protocol, *address[:2], event["message"])
        self.publish_callback(event)

    async def receive_tcp(self, reader, writer):
        self.clients.add(writer)
        buffer = b""
        try:
            while self.running:
                # Aceita linhas e o cliente original, que espera ACK sem enviar '\n'.
                try:
                    chunk = await asyncio.wait_for(reader.read(1024), 0.15 if buffer else 120)
                except asyncio.TimeoutError:
                    if not buffer:
                        break
                    chunk = None
                if chunk:
                    buffer += chunk
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    if len(line) > MAX_MESSAGE:
                        writer.write(b"ERRO: limite 4096 bytes\n")
                        await writer.drain()
                        return
                    self.publish("TCP", line.rstrip(b"\r"), writer.get_extra_info("peername"))
                    writer.write(b"OK TCP\n")
                    await writer.drain()
                if len(buffer) > MAX_MESSAGE:
                    writer.write(b"ERRO: limite 4096 bytes\n")
                    await writer.drain()
                    break
                if chunk is None or chunk == b"":
                    if buffer:
                        self.publish("TCP", buffer, writer.get_extra_info("peername"))
                        writer.write(b"OK TCP\n")
                        await writer.drain()
                        buffer = b""
                    if chunk == b"":
                        break
        except (ConnectionError, asyncio.CancelledError):
            pass
        finally:
            self.clients.discard(writer)
            writer.close()
            try:
                await writer.wait_closed()
            except ConnectionError:
                pass

    async def start(self):
        async with self.lock:
            if self.running:
                return self.status()
            try:
                self.tcp = await asyncio.start_server(self.receive_tcp, self.host, self.tcp_port)
                self.udp, _ = await asyncio.get_running_loop().create_datagram_endpoint(
                    lambda: UDPReceiver(self), local_addr=(self.host, self.udp_port))
                self.running = True
            except OSError as error:
                if self.tcp:
                    self.tcp.close()
                    await self.tcp.wait_closed()
                    self.tcp = None
                return self.status(False, f"Não foi possível abrir as portas: {error}")
            return self.status()

    async def stop(self):
        async with self.lock:
            self.running = False
            if self.tcp:
                self.tcp.close()
                await self.tcp.wait_closed()
                self.tcp = None
            if self.udp:
                self.udp.close()
                self.udp = None
            for client in list(self.clients):
                client.close()
            return self.status()
