#!/usr/bin/env python3
"""Zero-dependency local HTTP server for installing and running The Plain-English Foundations Library PWA."""

from __future__ import annotations

import argparse
import functools
import http.server
import socket
import webbrowser
from pathlib import Path

BOOKS_DIR = Path(__file__).resolve().parent


class LibraryRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve static PWA assets with strict Windows-safe MIME types and fresh SW headers."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".md": "text/markdown; charset=utf-8",
    }

    def end_headers(self) -> None:
        if self.path.split("?", 1)[0].endswith("/sw.js") or self.path.split("?", 1)[0] == "/sw.js":
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()


def find_open_port(host: str, start_port: int, attempts: int = 20) -> int:
    for p in range(start_port, start_port + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex((host, p)) != 0:
                return p
    return start_port


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve The Plain-English Foundations Library PWA.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Preferred port (default: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Do not launch browser automatically")
    args = parser.parse_args()

    port = find_open_port(args.host, args.port)
    handler = functools.partial(LibraryRequestHandler, directory=str(BOOKS_DIR))
    server = http.server.ThreadingHTTPServer((args.host, port), handler)
    url = f"http://{args.host}:{port}/index.html"
    print(f"Plain-English Foundations Library PWA serving at {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down library server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
