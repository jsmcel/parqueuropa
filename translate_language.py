import sys
import time
from pathlib import Path
from deep_translator import GoogleTranslator

if len(sys.argv) != 2:
    print('Usage: python translate_language.py <language-folder>')
    sys.exit(1)

target_lang_folder = sys.argv[1]

LANGUAGE_CODES = {
    'en': 'en',
    'fr': 'fr',
    'it': 'it',
    'de': 'de',
    'pt': 'pt',
    'zh': 'zh-CN',
    'ja': 'ja',
}

if target_lang_folder not in LANGUAGE_CODES:
    print(f'Unsupported language folder: {target_lang_folder}')
    sys.exit(1)

target_code = LANGUAGE_CODES[target_lang_folder]

ROOT = Path('backend/tenants/parque_europa/texts')
SOURCE_LANG = 'es'
MODES = ['normal', 'infantil', 'experto', 'cachondo']

source_dir = ROOT / SOURCE_LANG
translator_cache = {}

def get_translator(code):
    translator = translator_cache.get(code)
    if translator is None:
        translator = GoogleTranslator(source=SOURCE_LANG, target=code)
        translator_cache[code] = translator
    return translator


def translate_text(text, code):
    translator = get_translator(code)
    lines = text.split('\n')
    translated_lines = []
    for line in lines:
        if line.strip() == '':
            translated_lines.append('')
            continue
        for attempt in range(3):
            try:
                translated = translator.translate(line)
                translated_lines.append(translated)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1.5 * (attempt + 1))
    return '\n'.join(translated_lines)


def needs_translation(spanish_text, dest_path):
    if not dest_path.exists():
        return True, 'missing file'
    current = dest_path.read_text(encoding='utf-8')
    if current.strip() == '':
        return True, 'empty file'
    if current == spanish_text:
        return True, 'identical to Spanish'
    return False, 'already translated'

translated = 0
skipped = 0

for monument in sorted(source_dir.iterdir()):
    if not monument.is_dir():
        continue
    for mode in MODES:
        src_file = monument / f'{mode}.txt'
        if not src_file.exists():
            continue
        spanish_text = src_file.read_text(encoding='utf-8')
        dest_dir = ROOT / target_lang_folder / monument.name
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / f'{mode}.txt'
        should_translate, reason = needs_translation(spanish_text, dest_file)
        if not should_translate:
            skipped += 1
            continue
        translated_text = translate_text(spanish_text, target_code)
        dest_file.write_text(translated_text, encoding='utf-8')
        translated += 1
        print(f'Translated {target_lang_folder}/{monument.name}/{mode}.txt ({reason})')
        time.sleep(0.4)

print(f'Done. Translated {translated} files. Skipped {skipped} files already translated.')
