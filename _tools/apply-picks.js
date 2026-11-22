// Перенос выбора вариантов в src/_data/picks.json: node _tools/apply-picks.js <файл с текстом из кнопки «Скопировать выбор»>
// Текст вида «/yandex-direkt/: intro 2, loss 3», по строке на страницу. Страницы из текста заменяются целиком,
// остальные остаются как были; секции, которых нет в тексте, идут первым вариантом.
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
if (!file) { console.error('node _tools/apply-picks.js <файл>'); process.exit(1); }
const P = path.join(__dirname, '..', 'src', '_data', 'picks.json');
const picks = JSON.parse(fs.readFileSync(P, 'utf8'));
let n = 0;
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(\/[^:\s]*\/)\s*:\s*(.+)$/);
  if (!m) continue;
  const secs = {};
  for (const part of m[2].split(',')) { const x = part.trim().match(/^([\w-]+)\s+(\d+)$/); if (x) secs[x[1]] = +x[2]; }
  picks[m[1]] = secs; n++;
}
fs.writeFileSync(P, JSON.stringify(picks, null, 2) + '\n');
console.log(`Страниц с выбором: ${n}. Записано в ${path.relative(process.cwd(), P)}`);
