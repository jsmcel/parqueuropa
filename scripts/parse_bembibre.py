# -*- coding: utf-8 -*-
import json
import re
import sys
import unicodedata
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
raw_bytes = Path("Future/Bembibre.txt").read_bytes()
for encoding in ("utf-8", "latin-1", "cp1252"):
    try:
        text = raw_bytes.decode(encoding)
        break
    except UnicodeDecodeError:
        continue
else:
    text = raw_bytes.decode("latin-1", errors="replace")
if "Ã" in text:
    text = raw_bytes.decode("latin-1")
pattern = re.compile(r"(?P<order>\d+)\.\s*Parada\s*(?P<num>\d+):\s*(?P<title>.+?)\s+(?P<lat>-?\d+\.\d+),\s*(?P<lon>-?\d+\.\d+)")

def slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value

stops = []
for match in pattern.finditer(text):
    start = match.end()
    next_match = pattern.search(text, start)
    end = next_match.start() if next_match else len(text)
    body = text[start:end].strip()
    stops.append({
        "order": int(match.group("order")),
        "title": match.group("title").strip(),
        "lat": float(match.group("lat")),
        "lon": float(match.group("lon")),
        "slug": slugify(match.group("title")),
        "body": body,
    })
Path("Future/bembibre_parsed.json").write_text(json.dumps(stops, ensure_ascii=False, indent=2), encoding="utf-8")
print("Parsed", len(stops), "stops -> Future/bembibre_parsed.json")
