#!/usr/bin/env python3
"""Shows every board colour live: python3 assets/render/picker.py, then open http://localhost:8765/render/picker.html"""
import functools, http.server, os
ASSETS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print('open http://localhost:8765/render/picker.html')
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ASSETS)).serve_forever()
