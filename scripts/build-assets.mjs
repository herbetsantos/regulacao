import { access, cp, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptsDir);
const out = join(root, 'dist', 'client');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '0.0.0');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

for (const file of htmlFiles) {
  const source = await readFile(join(root, file), 'utf8');
  const versioned = source.replace(
    /(\/(?:js|css|assets)\/[^"'?#\s]+)\?v=\d+\.\d+\.\d+/g,
    `$1?v=${version}`,
  );
  await writeFile(join(out, file), versioned);
}

for (const file of ['_headers', '_redirects']) {
  try {
    await access(join(root, file));
    await copyFile(join(root, file), join(out, file));
  } catch {
    // Arquivo opcional.
  }
}

for (const dir of ['assets', 'css', 'js']) {
  await cp(join(root, dir), join(out, dir), { recursive: true });
}

console.log(`Assets públicos preparados em dist/client: ${htmlFiles.length} HTML(s), cache v${version}.`);
