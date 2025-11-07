from pathlib import Path

root = Path('backend/tenants/parque_europa/texts')
src_lang = 'es'
languages = ['en', 'fr', 'it', 'de', 'pt', 'zh', 'ja']
modes = ['normal', 'infantil', 'experto', 'cachondo']

source_dir = root / src_lang
pending = []

for monument in sorted(source_dir.iterdir()):
    if not monument.is_dir():
        continue
    for mode in modes:
        src_file = monument / f'{mode}.txt'
        if not src_file.exists():
            continue
        spanish_text = src_file.read_text(encoding='utf-8')
        for lang in languages:
            dest_file = root / lang / monument.name / f'{mode}.txt'
            if not dest_file.exists():
                pending.append((lang, monument.name, mode, 'missing file'))
                continue
            dest_text = dest_file.read_text(encoding='utf-8')
            if dest_text.strip() == '':
                pending.append((lang, monument.name, mode, 'empty file'))
            elif dest_text == spanish_text:
                pending.append((lang, monument.name, mode, 'identical to Spanish'))

if pending:
    print(f'{len(pending)} files need translation:')
    for lang, monument, mode, reason in pending:
        print(f' - {lang}/{monument}/{mode}.txt ({reason})')
else:
    print('All files appear translated (no missing/identical copies).')
