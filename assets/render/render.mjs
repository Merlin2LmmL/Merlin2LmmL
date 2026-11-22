// Renders every profile image. Each target is a canvas scene stepped frame by frame in headless Chrome
// (DevTools protocol, no npm deps) and encoded to an animated AVIF with transparency by ffmpeg.
//   node render.mjs                        all images
//   node render.mjs languages              only some
//   node render.mjs --test about 1.5 4     still frames -> test-about-1.5.png ...
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const here = path.dirname(fileURLToPath(import.meta.url)), assets = path.join(here, '..');
const content = JSON.parse(readFileSync(path.join(assets, 'content.json'), 'utf8'));
const langs = JSON.parse(readFileSync(path.join(assets, 'langs.json'), 'utf8'));
const ALL = ['header', 'about', 'card-0', 'card-1', 'card-2', 'card-3', 'languages'];
let args = process.argv.slice(2), test = null;
if (args[0] === '--test') { test = args.slice(2).map(Number); args = [args[1]]; }
const targets = args.length ? args : ALL;
const outName = t => t.startsWith('card-') ? 'card-' + content.cards[Number(t.slice(5))].file : t;
const port = 9333, profile = path.join(os.tmpdir(), 'm2l-render-chrome');
const chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let page;
for (let i = 0; i < 100 && !page; i++) { try { page = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'); } catch {} if (!page) await sleep(150); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => { const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (m.result.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || JSON.stringify(m.result.exceptionDetails)); return m.result.result.value; };
const fonts = Object.entries({ LB: 'black', LBo: 'bold', LR: 'reg', MO: 'mono' }).map(([fam, f]) => [fam, readFileSync(path.join(assets, 'fonts', f + '.woff2')).toString('base64')]);
const loadFonts = '(async () => { for (const [n, b] of ' + JSON.stringify(fonts) + ') { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); const f = new FontFace(n, u.buffer); await f.load(); document.fonts.add(f); } return true; })()';
try {
  for (const target of targets) {
    const file = target === 'header' ? 'header.html' : 'panels.html';
    await send('Page.navigate', { url: 'file://' + path.join(here, file) + '?' + target });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) { try { ready = await evaluate('location.search === ' + JSON.stringify('?' + target) + ' && document.readyState === "complete" && typeof window.setup === "function"'); } catch {} if (!ready) await sleep(100); }
    if (!ready) throw new Error(target + ': scene not ready ' + await evaluate('String(window.__err)').catch(String));
    await evaluate(loadFonts);
    const spec = JSON.parse(await evaluate('JSON.stringify(window.setup(' + JSON.stringify(target) + ', ' + JSON.stringify({ content, langs }) + '))'));
    const png = async t => Buffer.from((await evaluate('window.frame(' + t + ')')).split(',')[1], 'base64');
    if (test) { for (const t of test) writeFileSync(path.join(here, 'test-' + target + '-' + t + '.png'), await png(t)); continue; }
    const dir = path.join(here, 'frames', target), N = Math.round(spec.T * spec.fps);
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    for (let f = 0; f < N; f++) writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.png'), await png(f / spec.fps));
    const out = path.join(assets, outName(target) + '.avif');
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(spec.fps), '-i', path.join(dir, '%04d.png'),
      '-filter_complex', '[0:v]format=yuva420p,split[c][a];[a]alphaextract[al]', '-map', '[c]', '-map', '[al]',
      '-c:v', 'libaom-av1', '-cpu-used', '6', '-row-mt', '1', '-crf', '32', '-b:v', '0', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg failed for ' + target);
    rmSync(dir, { recursive: true, force: true });
    console.log(target, '->', path.relative(assets, out), N, 'frames');
  }
} finally { ws.close(); const gone = new Promise(r => chrome.once('exit', r)); chrome.kill(); await gone; try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {} }
