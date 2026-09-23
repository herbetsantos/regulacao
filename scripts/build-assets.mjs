import { access, cp, copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptsDir);
const out = join(root, 'dist', 'client');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

for (const file of htmlFiles) {
  await copyFile(join(root, file), join(out, file));
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

console.log(
  `Assets públicos preparados em dist/client: ${htmlFiles.length} HTML(s), assets/, css/ e js/.`
);
