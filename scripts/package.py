from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
downloads = root / 'dist' / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(downloads / 'tab-brain-extension.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted((root / 'extension-dist').rglob('*')):
        if file.is_file():
            archive.write(file, Path('tab-brain') / file.relative_to(root / 'extension-dist'))
source_roots = ['src', 'public', 'extension', 'scripts', 'docs', 'tests', 'shared', 'functions', '.github']
source_files = ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'vercel.json', 'firebase.json', 'firestore.rules', 'firestore.indexes.json', 'README.md', 'LICENSE', '.gitignore', '.vercelignore', '.npmrc', '.firebaserc', '.env.example', 'CONTRIBUTING.md']
with zipfile.ZipFile(downloads / 'tab-brain-source.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in source_files:
        file = root / name
        if file.is_file():
            archive.write(file, Path('tab-brain') / name)
    for name in source_roots:
        for file in sorted((root / name).rglob('*')):
            if file.is_file() and not any((part.startswith('.') and part not in {'.github', '.env.example'}) or part in {'__pycache__', 'node_modules', 'lib', 'reports', 'test-results'} for part in file.relative_to(root).parts):
                archive.write(file, Path('tab-brain') / file.relative_to(root))
artifacts = {}
for file in downloads.glob('*.zip'):
    artifacts[file.name] = {'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
(downloads / 'checksums.json').write_text(json.dumps(artifacts, indent=2) + '\n')
print('Packaged Chrome extension and complete source download.')
