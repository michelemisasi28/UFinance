// Aggiorna il numero di build (sw.js e app.js) in base al contenuto dei file dell'app.
// Va eseguito prima di ogni pubblicazione: un sw.js diverso fa partire l'aggiornamento sui telefoni.
//   node tools/stamp.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const APP = path.join(__dirname, '..', 'app');
const files = ['index.html', 'css/app.css', 'js/repo.js', 'js/voice.js', 'js/app.js', 'js/pwa.js', 'manifest.webmanifest'];
const strip = (f, s) => f === 'js/app.js' ? s.replace(/^window\.UF_BUILD = '.*';\n/, '') : s;
const h = crypto.createHash('sha256');
for (const f of files) h.update(f + '\0' + strip(f, fs.readFileSync(path.join(APP, f), 'utf8')));
const id = h.digest('hex').slice(0, 8), day = new Date().toISOString().slice(0, 10);
const sw = path.join(APP, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const BUILD = '[^']*';/, `const BUILD = '${id}';`));
const app = path.join(APP, 'js/app.js');
fs.writeFileSync(app, fs.readFileSync(app, 'utf8').replace(/^window\.UF_BUILD = '.*';/, `window.UF_BUILD = '${day} · ${id}';`));
// Content-Security-Policy: impronta dello script in linea di index.html (netlify.toml deve combaciare, altrimenti il browser lo blocca)
const inline = /<script>([\s\S]*?)<\/script>/.exec(fs.readFileSync(path.join(APP, 'index.html'), 'utf8'));
const toml = path.join(__dirname, '..', 'netlify.toml');
if (inline) {
  const sha = crypto.createHash('sha256').update(inline[1], 'utf8').digest('base64');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf8').replace(/'sha256-[^']*'/, `'sha256-${sha}'`));
}
console.log('build', day, id);
