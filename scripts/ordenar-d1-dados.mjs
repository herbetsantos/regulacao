import fs from 'node:fs';

const schemaPath = process.argv[2] || 'database/schema.sql';
const dumpPath = process.argv[3] || 'd1-homolog-data.sql';
const outPath = process.argv[4] || 'd1-homolog-data-ordered.sql';

const schema = fs.readFileSync(schemaPath, 'utf8');
const dump = fs.readFileSync(dumpPath, 'utf8');

function splitStatements(sql) {
  const out = [];
  let buf = '';
  let single = false;
  let double = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (lineComment) {
      buf += ch;
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i++;
        blockComment = false;
      }
      continue;
    }
    if (!single && !double && ch === '-' && next === '-') {
      buf += ch + next;
      i++;
      lineComment = true;
      continue;
    }
    if (!single && !double && ch === '/' && next === '*') {
      buf += ch + next;
      i++;
      blockComment = true;
      continue;
    }
    if (!double && ch === "'") {
      buf += ch;
      if (single && next === "'") {
        buf += next;
        i++;
      } else {
        single = !single;
      }
      continue;
    }
    if (!single && ch === '"') {
      buf += ch;
      if (double && next === '"') {
        buf += next;
        i++;
      } else {
        double = !double;
      }
      continue;
    }

    buf += ch;
    if (!single && !double && ch === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const tableRe = /CREATE TABLE IF NOT EXISTS\s+(?:"([^"]+)"|([A-Za-z0-9_]+))\s*\(([\s\S]*?)\);/gi;
const tables = new Map();
let m;
while ((m = tableRe.exec(schema))) {
  const name = m[1] || m[2];
  const body = m[3];
  const refs = [...body.matchAll(/REFERENCES\s+(?:"([^"]+)"|([A-Za-z0-9_]+))/gi)]
    .map(x => x[1] || x[2]);
  tables.set(name.toLowerCase(), { name, refs });
}
if (!tables.size) throw new Error('Nenhuma tabela encontrada em ' + schemaPath);

const ordered = [];
const state = new Map();
function visit(key, stack = []) {
  const s = state.get(key) || 0;
  if (s === 2) return;
  if (s === 1) throw new Error('Ciclo de chaves estrangeiras: ' + [...stack, key].join(' -> '));
  state.set(key, 1);
  const t = tables.get(key);
  for (const ref of t.refs) {
    const dep = ref.toLowerCase();
    if (dep === key) continue;
    if (tables.has(dep)) visit(dep, [...stack, key]);
  }
  state.set(key, 2);
  ordered.push(t.name);
}
for (const key of tables.keys()) visit(key);

const statements = splitStatements(dump);
const byTable = new Map();
for (const name of ordered) byTable.set(name.toLowerCase(), []);

const ignored = [];
for (const stmt of statements) {
  const clean = stmt
    .replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '')
    .trim();

  if (!clean) continue;
  if (/^(PRAGMA|BEGIN\b|COMMIT\b|ROLLBACK\b)/i.test(clean)) continue;
  if (/^DELETE\s+FROM\s+(?:"?sqlite_sequence"?)/i.test(clean)) continue;

  const im = clean.match(/^INSERT(?:\s+OR\s+\w+)?\s+INTO\s+(?:"([^"]+)"|\x60([^\x60]+)\x60|\[([^\]]+)\]|([A-Za-z0-9_]+))/i);
  if (im) {
    const table = im[1] || im[2] || im[3] || im[4];
    const key = table.toLowerCase();
    if (/^(sqlite_|_cf_)/i.test(table)) continue;
    if (!byTable.has(key)) {
      throw new Error('Dump contem INSERT para tabela ausente do schema consolidado: ' + table);
    }
    byTable.get(key).push(stmt.endsWith(';') ? stmt : stmt + ';');
    continue;
  }

  ignored.push(clean.slice(0, 120));
}

if (ignored.length) {
  throw new Error(
    'Dump contem comandos de dados inesperados. Primeiros exemplos: ' +
    ignored.slice(0, 8).join(' | ')
  );
}

const lines = [
  '-- Gerado automaticamente: dados do homolog ordenados por dependencias de chave estrangeira.',
  '-- O schema deve ser aplicado antes deste arquivo.',
  ''
];

let total = 0;
for (const name of ordered) {
  const rows = byTable.get(name.toLowerCase());
  if (!rows?.length) continue;
  lines.push('-- tabela: ' + name);
  lines.push(...rows);
  lines.push('');
  total += rows.length;
}

if (!total) throw new Error('Nenhum INSERT de dados foi encontrado no dump.');

fs.writeFileSync(outPath, lines.join('\n'));
console.log('Ordem de carga: ' + ordered.join(' -> '));
console.log('Arquivo preparado com ' + total + ' INSERT(s): ' + outPath);
