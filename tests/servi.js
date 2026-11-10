// Server di prova dell'app con le STESSE intestazioni di sicurezza del sito (lette da netlify.toml),
// così la Content-Security-Policy viene provata in locale prima di pubblicare.
//   node tests/servi.js [porta] [cartella]
const http = require('http'), fs = require('fs'), path = require('path');
const port = +(process.argv[2] || 8765), root = path.resolve(process.argv[3] || path.join(__dirname, '..', 'app'));
const toml = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');
// blocchi [[headers]] for = "..." con le coppie Nome = "valore"
const rules = toml.split('[[headers]]').slice(1).map(b => {
  const f = /for\s*=\s*"([^"]+)"/.exec(b), h = {};
  b.split('\n').forEach(l => { const m = /^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/.exec(l); if (m && m[1] !== 'for') h[m[1]] = m[2]; });
  return { for: f ? f[1] : '', h };
});
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(404); res.end('non trovato'); return; }
    const h = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    rules.forEach(r => { if (r.for === '/*' || r.for === p) Object.assign(h, r.h); });
    h['Cache-Control'] = 'no-store';
    res.writeHead(200, h); res.end(buf);
  });
}).listen(port, '127.0.0.1');
