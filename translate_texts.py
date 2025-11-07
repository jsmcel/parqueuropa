from pathlib import Path
from deep_translator import GoogleTranslator
import time

root = Path('backend/tenants/parque_europa/texts')
source_lang = 'es'
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
    if target_code not in translator_cache:
        translator_cache[target_code] = GoogleTranslator(source=source_lang, target=target_code)
    return translator_cache[target_code]


def translate_text(text, target_code):
    translator = get_translator(target_code)
    # translate line by line to preserve formatting and avoid length limits
    lines = text.split('\n')
    translated_lines = []
    for line in lines:
        if not line.strip():
            translated_lines.append('')
            continue
        for attempt in range(3):
            try:
                translated_lines.append(translator.translate(line))
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                time.sleep(1 + attempt)
    return '\n'.join(translated_lines)


updated_files = []
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
            translated = translate_text(spanish_text, target_code)
            dest_file.write_text(translated, encoding='utf-8')
            updated_files.append(dest_file.relative_to(root))
            time.sleep(0.2)

print(f'Translated and updated {len(updated_files)} files.')
