#!/usr/bin/env python3
"""Cliente UDP portátil (Windows/Linux). Um datagrama UTF-8 por mensagem."""
import argparse
import socket


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("host", nargs="?", default="ine5646.lucas.feitor.vms.ufsc.br")
    parser.add_argument("--port", type=int, default=8081)
    parser.add_argument("--message", help="Envia uma mensagem e termina")
    args = parser.parse_args()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
            client.settimeout(5)
            while True:
                text = args.message if args.message is not None else input("Mensagem (exit para sair): ")
                payload = text.encode("utf-8")
                if len(payload) > 4096:
                    raise ValueError("Limite de 4096 bytes por mensagem")
                client.sendto(payload, (args.host, args.port))
                try:
                    print(client.recvfrom(1024)[0].decode("utf-8", errors="replace"))
                except socket.timeout:
                    print("Sem resposta em 5 segundos. UDP não garante entrega.")
                    if args.message is not None:
                        raise
                if args.message is not None or text.lower() in ("exit", "quit"):
                    break
    except (OSError, ValueError) as error:
        parser.exit(1, f"Erro: {error}\n")
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    main()
