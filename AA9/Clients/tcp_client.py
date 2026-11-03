#!/usr/bin/env python3
"""Cliente TCP portátil (Windows/Linux). Uma linha UTF-8 por mensagem."""
import argparse
import socket


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("host", nargs="?", default="ine5646.lucas.feitor.vms.ufsc.br")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--message", help="Envia uma mensagem e termina")
    args = parser.parse_args()
    try:
        while True:
            text = args.message if args.message is not None else input("Mensagem (exit para sair): ")
            payload = text.encode("utf-8")
            if len(payload) > 4096:
                raise ValueError("Limite de 4096 bytes por mensagem")
            with socket.create_connection((args.host, args.port), timeout=5) as client:
                client.sendall(payload + b"\n")
                print(client.recv(1024).decode("utf-8", errors="replace").strip())
            if args.message is not None or text.lower() in ("exit", "quit"):
                break
    except (OSError, ValueError) as error:
        parser.exit(1, f"Erro: {error}\n")
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    main()
