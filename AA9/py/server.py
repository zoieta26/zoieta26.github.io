#!/usr/bin/env python3
"""Servidor TLS/WSS persistente, com controle TCP/UDP pelo próprio WSS."""
import asyncio
import json
import logging
import os
import ssl
from pathlib import Path
from aiohttp import web, WSMsgType
from server_manager import ServerManager

ROOT = Path(__file__).resolve().parents[1]
HOSTNAME = os.getenv("AA9_HOST", "ine5646.lucas.feitor.vms.ufsc.br")


def create_app(host="0.0.0.0", tcp_port=8080, udp_port=8081, origin=None):
    app = web.Application()
    peers = {}

    def broadcast(event):
        for ws, queue in list(peers.items()):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Desconecta consumidores lentos; a memória permanece limitada.
                asyncio.create_task(ws.close(code=1013, message=b"Consumidor lento"))

    manager = ServerManager(broadcast, host, tcp_port, udp_port)

    async def sender(ws, queue):
        while True:
            await ws.send_json(await queue.get())

    async def websocket(request):
        if not request.secure:
            raise web.HTTPForbidden(text="TLS obrigatório")
        if request.headers.get("Origin") != (origin or f"https://{HOSTNAME}"):
            raise web.HTTPForbidden(text="Origem não autorizada")
        ws = web.WebSocketResponse(heartbeat=25, max_msg_size=4096)
        await ws.prepare(request)
        queue = asyncio.Queue(maxsize=256)
        peers[ws] = queue
        task = asyncio.create_task(sender(ws, queue))
        queue.put_nowait(manager.status())
        try:
            async for msg in ws:
                if msg.type != WSMsgType.TEXT:
                    continue
                try:
                    data = json.loads(msg.data)
                    action = data.get("action") if isinstance(data, dict) else None
                    if action == "start":
                        broadcast(await manager.start())
                    elif action == "stop":
                        broadcast(await manager.stop())
                    elif action in ("status", "heartbeat"):
                        queue.put_nowait(manager.status())
                    else:
                        queue.put_nowait({"type": "error", "message": "Ação inválida"})
                except (ValueError, TypeError):
                    queue.put_nowait({"type": "error", "message": "JSON inválido"})
        finally:
            peers.pop(ws, None)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        return ws

    async def certificate_help(request):
        return web.Response(text="TLS da porta 8082 ativo. Volte à página HTTPS /AA/AA9/.",
                            content_type="text/plain")

    async def shutdown(app):
        await manager.stop()
        await asyncio.gather(*(ws.close(code=1001) for ws in list(peers)))

    app.router.add_get("/", certificate_help)
    app.router.add_get("/AA/AA9/ws", websocket)
    app.on_shutdown.append(shutdown)
    return app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.minimum_version = ssl.TLSVersion.TLSv1_2
    tls.load_cert_chain(os.getenv("AA9_CERT", "/etc/apache2/ssl/apache.crt"),
                        os.getenv("AA9_KEY", "/etc/apache2/ssl/apache.key"))
    web.run_app(create_app(), host=os.getenv("AA9_WS_HOST", "0.0.0.0"), port=8082, ssl_context=tls)
