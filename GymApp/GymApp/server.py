"""Local GymApp server — API, CRUD, Excel import."""
from __future__ import annotations

import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import plan_store as store

ROOT = Path(__file__).parent
STATIC = ROOT / "static"
PROGRESS_FILE = store.DATA / "progress.json"

DEFAULT_PROGRESS = {
    "start_date": None,
    "current_day": 1,
    "day_logs": {},
    "weekly_logs": {},
}


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    return json.loads(json.dumps(DEFAULT_PROGRESS))


def save_progress(data: dict) -> None:
    store.DATA.mkdir(parents=True, exist_ok=True)
    PROGRESS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def parse_multipart_file(body: bytes, content_type: str) -> bytes | None:
    m = re.search(r'boundary=(.+?)(?:;|$)', content_type)
    if not m:
        return None
    boundary = m.group(1).strip().encode()
    if boundary.startswith(b'"') and boundary.endswith(b'"'):
        boundary = boundary[1:-1]

    for part in body.split(b"--" + boundary):
        if b"filename=" not in part:
            continue
        header_end = part.find(b"\r\n\r\n")
        if header_end == -1:
            continue
        file_data = part[header_end + 4 :]
        if file_data.endswith(b"\r\n"):
            file_data = file_data[:-2]
        if file_data.endswith(b"--"):
            file_data = file_data[:-2]
        if file_data.endswith(b"\r\n"):
            file_data = file_data[:-2]
        return file_data
    return None


class GymAppHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length) if length else b""

    def _read_json(self) -> dict | list | None:
        try:
            return json.loads(self._read_body().decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _send_json(self, payload: dict | list, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path) -> None:
        if not path.is_file():
            self.send_error(404)
            return
        mime, _ = mimetypes.guess_type(str(path))
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _query_params(self) -> dict:
        return parse_qs(urlparse(self.path).query)

    def _section_from_path(self, parts: list[str]) -> str | None:
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "plan":
            section = parts[2]
            if section in store.SECTION_MAP:
                return section
        return None

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        parts = [p for p in path.split("/") if p]

        if path == "/api/plan":
            self._send_json(store.load_plan())
            return
        if path == "/api/progress":
            self._send_json(load_progress())
            return

        section = self._section_from_path(parts)
        if section:
            plan = store.load_plan()
            records = store.get_records(plan, section)
            params = self._query_params()
            q = params.get("q", [""])[0]
            day_s = params.get("day", [None])[0]
            day = int(day_s) if day_s and day_s.isdigit() else None

            if len(parts) == 4 and parts[3] == "day" and day_s:
                idx = store.find_by_day(records, int(day_s))
                if idx is None:
                    self._send_json({"error": "Not found"}, status=404)
                else:
                    self._send_json({"index": idx, **records[idx]})
                return

            if len(parts) == 4 and parts[3].isdigit():
                idx = int(parts[3])
                if idx < 0 or idx >= len(records):
                    self._send_json({"error": "Not found"}, status=404)
                else:
                    self._send_json({"index": idx, **records[idx]})
                return

            results = store.query_records(records, q=q, day=day)
            self._send_json({"items": results, "total": len(results)})
            return

        if path in ("/", "/index.html"):
            self._send_file(STATIC / "index.html")
            return

        static_path = STATIC / path.lstrip("/")
        if static_path.is_file() and static_path.resolve().is_relative_to(STATIC.resolve()):
            self._send_file(static_path)
            return

        self.send_error(404)

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        parts = [p for p in path.split("/") if p]
        data = self._read_json()
        if data is None:
            self._send_json({"error": "Invalid JSON"}, status=400)
            return

        if path == "/api/plan":
            if not isinstance(data, dict):
                self._send_json({"error": "Expected plan object"}, status=400)
                return
            store.save_plan(data)
            self._send_json({"ok": True})
            return

        if path == "/api/progress":
            store.DATA.mkdir(parents=True, exist_ok=True)
            save_progress(data)
            self._send_json({"ok": True})
            return

        section = self._section_from_path(parts)
        if not section:
            self.send_error(404)
            return

        plan = store.load_plan()
        try:
            if len(parts) == 5 and parts[3] == "day" and parts[4].isdigit():
                record = store.upsert_by_day(plan, section, int(parts[4]), data)
                self._send_json(record)
                return

            if len(parts) == 4 and parts[3].isdigit():
                record = store.update_record(plan, section, int(parts[3]), data)
                self._send_json(record)
                return
        except (IndexError, ValueError) as e:
            self._send_json({"error": str(e)}, status=404)
            return

        self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        parts = [p for p in path.split("/") if p]

        if path == "/api/progress":
            data = self._read_json()
            if data is None:
                self._send_json({"error": "Invalid JSON"}, status=400)
                return
            save_progress(data)
            self._send_json({"ok": True})
            return

        if path == "/api/import/excel":
            content_type = self.headers.get("Content-Type", "")
            body = self._read_body()
            file_bytes = None

            if "multipart/form-data" in content_type:
                file_bytes = parse_multipart_file(body, content_type)
            else:
                file_bytes = body

            if not file_bytes:
                self._send_json({"error": "No file uploaded"}, status=400)
                return

            params = self._query_params()
            mode = params.get("mode", ["replace"])[0]
            title = params.get("title", [None])[0]

            try:
                imported = store.import_workbook(file_bytes, title=title)
            except Exception as e:
                self._send_json({"error": f"Import failed: {e}"}, status=400)
                return

            if mode == "merge":
                existing = store.load_plan()
                for name, rows in imported["sheets"].items():
                    existing["sheets"][name] = rows
                for name in imported["sheet_order"]:
                    if name not in existing["sheet_order"]:
                        existing["sheet_order"].append(name)
                if title:
                    existing["title"] = title
                store.save_plan(existing)
                plan = existing
            else:
                store.save_plan(imported)
                plan = imported

            self._send_json({
                "ok": True,
                "title": plan["title"],
                "sheets": {k: len(v) for k, v in plan["sheets"].items()},
            })
            return

        section = self._section_from_path(parts)
        if section and len(parts) == 3:
            data = self._read_json()
            if not isinstance(data, dict):
                self._send_json({"error": "Expected record object"}, status=400)
                return
            plan = store.load_plan()
            try:
                record = store.create_record(plan, section, data)
                self._send_json(record, status=201)
            except ValueError as e:
                self._send_json({"error": str(e)}, status=409)
            return

        self.send_error(404)

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        parts = [p for p in path.split("/") if p]
        section = self._section_from_path(parts)
        if not section:
            self.send_error(404)
            return

        plan = store.load_plan()
        try:
            if len(parts) == 5 and parts[3] == "day" and parts[4].isdigit():
                store.delete_by_day(plan, section, int(parts[4]))
                self._send_json({"ok": True})
                return
            if len(parts) == 4 and parts[3].isdigit():
                store.delete_record(plan, section, int(parts[3]))
                self._send_json({"ok": True})
                return
        except IndexError:
            self._send_json({"error": "Not found"}, status=404)
            return

        self.send_error(404)


def main() -> None:
    store.DATA.mkdir(parents=True, exist_ok=True)
    if not store.PLAN_FILE.exists():
        xlsx = ROOT / "Complete_60Days_Lean_Bulk_Plan.xlsx"
        if xlsx.exists():
            store.save_plan(store.import_workbook(xlsx, title="60 Days Lean Bulk Plan"))
            print("Auto-imported Excel plan.")
        else:
            store.save_plan(store.default_plan())
            print("Created empty plan.")

    host, port = "127.0.0.1", 8765
    server = ThreadingHTTPServer((host, port), GymAppHandler)
    print(f"GymApp running at http://{host}:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
