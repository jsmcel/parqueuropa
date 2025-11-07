from pathlib import Path
from deep_translator import GoogleTranslator
import time

root = Path('backend/tenants/parque_europa/texts')
source_lang = 'es'
# Mapping from folder name to target locale code for the translator
languages = {
    'en': 'en',
    'fr': 'fr',
    'it': 'it',
    'de': 'de',
    'pt': 'pt',
    'zh': 'zh-CN',
    'ja': 'ja',
}
modes = ['normal', 'infantil', 'experto', 'cachondo']
source_dir = root / source_lang

translator_cache = {}

def get_translator(target_code):
    translator = translator_cache.get(target_code)
    if translator is None:
        translator = GoogleTranslator(source=source_lang, target=target_code)
        translator_cache[target_code] = translator
    return translator


def translate_text(text, target_code):
    translator = get_translator(target_code)
    lines = text.split('\n')
    translated_lines = []
    for line in lines:
        if line.strip() == '':
            translated_lines.append('')
            continue
        for attempt in range(3):
            try:
                translated_line = translator.translate(line)
                translated_lines.append(translated_line)
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                time.sleep(1.5 * (attempt + 1))
    return '\n'.join(translated_lines)


def needs_translation(spanish_text, dest_file):
    if not dest_file.exists():
        return True, 'missing file'
    existing_text = dest_file.read_text(encoding='utf-8')
    if existing_text.strip() == '':
        return True, 'empty file'
    if existing_text == spanish_text:
        return True, 'identical to Spanish'
    return False, 'already translated'

translated_count = 0
skipped = []

for monument in sorted(source_dir.iterdir()):
    if not monument.is_dir():
        continue
    for mode in modes:
        src_file = monument / f'{mode}.txt'
        if not src_file.exists():
            continue
        spanish_text = src_file.read_text(encoding='utf-8')
        for lang_folder, target_code in languages.items():
            dest_dir = root / lang_folder / monument.name
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_file = dest_dir / f'{mode}.txt'
            should_translate, reason = needs_translation(spanish_text, dest_file)
            if not should_translate:
                skipped.append((lang_folder, monument.name, mode))
                continue
            translated_text = translate_text(spanish_text, target_code)
            dest_file.write_text(translated_text, encoding='utf-8')
            translated_count += 1
            print(f"Translated {lang_folder}/{monument.name}/{mode}.txt ({reason})")
            time.sleep(0.4)

print(f"Finished translating {translated_count} files.")
if skipped:
    print(f"Skipped {len(skipped)} files that already had non-Spanish content.")
