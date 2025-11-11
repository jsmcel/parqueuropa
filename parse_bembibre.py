import argparse
import json
import re
import unicodedata
from pathlib import Path


def slugify(value: str) -> str:
    ascii_text = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    slug = re.sub(r'[^a-z0-9]+', '-', ascii_text.lower()).strip('-')
    return slug or 'parada'


def parse_stops(raw_text: str) -> list[dict]:
    pattern = re.compile(
        r"(?P<num>\d+)\.\s*Parada\s*\d+:\s*(?P<title>.+?)"
        r"(?:\s+(?P<lat>-?\d+\.\d+),\s*(?P<lon>-?\d+\.\d+))?\s*(?:\r?\n|$)",
        re.MULTILINE,
    )
    manual_coords = {
        3: (42.614100008648485, -6.417860356393775),
    }
    manual_slugs = {
        1: 'plaza-mayor-bembibre',
        2: 'iglesia-san-pedro-bembibre',
        3: 'ruta-modernista-bembibre',
        4: 'villavieja-castillo-bembibre',
        5: 'santuario-ecce-homo-bembibre',
        6: 'casa-de-las-culturas-bembibre',
        7: 'museo-alto-bierzo-bembibre',
    }
    matches = list(pattern.finditer(raw_text))
    stops = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw_text)
        body = raw_text[start:end].strip()
        lat = match.group('lat')
        lon = match.group('lon')
        order = index + 1
        if lat is None and order in manual_coords:
            lat, lon = manual_coords[order]
        elif lat is not None:
            lat = float(lat)
            lon = float(lon)
        stops.append(
            {
                'order': order,
                'title': match.group('title').strip(),
                'lat': lat,
                'lon': lon,
                'slug': manual_slugs.get(order, slugify(match.group('title'))),
                'body': body,
            }
        )
    return stops


def main() -> None:
    parser = argparse.ArgumentParser(description='Parse Bembibre itinerary text into structured data.')
    parser.add_argument('--output', help='Optional path to write the JSON payload.')
    parser.add_argument(
        '--write-texts',
        action='store_true',
        help='Write each stop body into backend tenant text folders (normal mode).',
    )
    parser.add_argument(
        '--texts-root',
        default='backend/tenants/bembibre/texts/es',
        help='Base folder where stop text directories live.',
    )
    parser.add_argument(
        '--mode',
        default='normal',
        help='Audio/text mode filename to generate when using --write-texts.',
    )
    args = parser.parse_args()

    source_path = Path('Future/Bembibre.txt')
    raw_text = source_path.read_text(encoding='utf-8')
    stops = parse_stops(raw_text)

    if args.write_texts:
        base_path = Path(args.texts_root)
        for stop in stops:
            target_dir = base_path / stop['slug']
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / f'{args.mode}.txt'
            target_file.write_text(stop['body'].strip() + '\n', encoding='utf-8')

    payload = json.dumps(stops, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(payload, encoding='utf-8')
    else:
        print(payload)


if __name__ == '__main__':
    main()
