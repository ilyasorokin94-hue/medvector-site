// Tiny localhost receiver: POST /save?name=file.png with raw bytes -> ../assets/img/gen/<name>
const http = require('http');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'assets', 'img', 'gen');
fs.mkdirSync(out, { recursive: true });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
};
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://localhost');
  const name = path.basename(u.searchParams.get('name') || 'img.bin').replace(/[^\w.-]/g, '_');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(path.join(out, name), buf);
    console.log('saved', name, buf.length);
    res.writeHead(200, cors); res.end('ok ' + buf.length);
  });
}).listen(8765, '127.0.0.1', () => console.log('listening 8765'));
