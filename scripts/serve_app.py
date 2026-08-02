#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen
import json
import shutil
import subprocess
import sys

APP_DIR = Path(__file__).resolve().parents[1] / "app"
GEOJS_ENDPOINT = "https://get.geojs.io/v1/ip/geo.json"
OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
MAX_UPSTREAM_BYTES = 1_000_000


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == "/api/live-weather/geo":
            if parsed.query:
                self.send_json_error(400, "Unexpected geo query parameters")
                return
            self.proxy_json(GEOJS_ENDPOINT)
            return
        if parsed.path == "/api/live-weather/open-meteo":
            if not valid_open_meteo_query(parsed.query):
                self.send_json_error(400, "Invalid Open-Meteo query parameters")
                return
            suffix = f"?{parsed.query}" if parsed.query else ""
            self.proxy_json(f"{OPEN_METEO_ENDPOINT}{suffix}")
            return
        super().do_GET()

    def translate_path(self, request_path):
        candidate = Path(super().translate_path(request_path)).resolve()
        try:
            candidate.relative_to(APP_DIR.resolve())
        except ValueError:
            return str(APP_DIR / ".itsees-not-found")
        return str(candidate)

    def proxy_json(self, url):
        try:
            status, body = fetch_json_bytes(url)
        except HTTPError as error:
            self.send_json_error(error.code, f"Upstream request failed with status {error.code}")
            return
        except (URLError, TimeoutError) as error:
            self.send_json_error(502, f"Upstream request failed: {error.reason if hasattr(error, 'reason') else error}")
            return
        except RuntimeError as error:
            self.send_json_error(502, str(error))
            return

        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json_error(self, status, message):
        body = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def fetch_json_bytes(url):
    curl = shutil.which("curl")
    if curl:
        result = run_curl_json(curl, url)
        if result.returncode != 0:
            result = run_curl_json(curl, url, bypass_proxy=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip() or "Upstream request failed")
        body, _, status_text = result.stdout.rpartition(b"\n")
        if len(body) > MAX_UPSTREAM_BYTES:
            raise RuntimeError("Upstream response is too large")
        status = int(status_text or b"502")
        if status < 200 or status >= 300:
            raise RuntimeError(f"Upstream request failed with status {status}")
        return status, body

    request = Request(url, headers={"Accept": "application/json", "User-Agent": "Itsees/0.1.0-beta.1"})
    with urlopen(request, timeout=10) as response:
        body = response.read(MAX_UPSTREAM_BYTES + 1)
        if len(body) > MAX_UPSTREAM_BYTES:
            raise RuntimeError("Upstream response is too large")
        return response.status, body


def valid_open_meteo_query(query):
    parameters = parse_qs(query, keep_blank_values=True)
    if set(parameters) - {"latitude", "longitude", "current", "timezone"}:
        return False
    if any(len(values) != 1 for values in parameters.values()):
        return False
    try:
        latitude = float(parameters["latitude"][0])
        longitude = float(parameters["longitude"][0])
    except (KeyError, TypeError, ValueError):
        return False
    current = parameters.get("current", [""])[0]
    return (
        -90 <= latitude <= 90
        and -180 <= longitude <= 180
        and parameters.get("timezone") == ["auto"]
        and 0 < len(current) <= 500
    )


def run_curl_json(curl, url, bypass_proxy=False):
    command = [
        curl,
        "--silent",
        "--show-error",
        "--max-time",
        "10",
        "--max-filesize",
        str(MAX_UPSTREAM_BYTES),
        "--header",
        "Accept: application/json",
        "--write-out",
        "\n%{http_code}",
    ]
    if bypass_proxy:
        command.extend(["--noproxy", "*"])
    command.append(url)
    return subprocess.run(command, capture_output=True, check=False)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    host = "127.0.0.1"
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"Serving {APP_DIR} on http://{host}:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
