from pathlib import Path
import re
text = Path('Future/Bembibre.txt').read_text(encoding='utf-8', errors='replace')
patt = re.compile(r"(?:\d+\.\s*)?Parada\s*\d+:\s*(?P<title>.+?)\s+(?P<lat>-?\d+\.\d+),\s*(?P<lon>-?\d+\.\d+)")
for i, m in enumerate(patt.finditer(text), 1):
    print(i, '|', m.group('title'), '|', m.group('lat'), m.group('lon'))
