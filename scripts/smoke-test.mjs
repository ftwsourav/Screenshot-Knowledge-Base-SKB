import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = '5757'; // avoid colliding with default 5656
const tmpRoot = mkdtempSync(join(tmpdir(), 'skb-smoke-'));
const env = {
  ...process.env,
  SKB_PORT: port,
  SKB_DB_PATH: join(tmpRoot, 'database.db'),
  SKB_IMAGES_PATH: join(tmpRoot, 'images'),
  SKB_LOG_LEVEL: 'info',
};

const child = spawn('node', ['packages/server/dist/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', (d) => { stdout += d; });
child.stderr.on('data', (d) => { stderr += d; });

const fetchJson = async (url) => {
  const r = await fetch(url);
  return { status: r.status, body: await r.json() };
};

// Kill the child and wait for it to fully exit (stdio streams closed) before the
// parent exits. On Windows, calling process.exit() while the child's pipe
// handles are still closing trips a libuv assertion (src\win\async.c), so we
// await the 'close' event (with a safety timeout) first.
const killAndWait = (signal = 'SIGINT') => new Promise((resolve) => {
  let done = false;
  const finish = () => { if (!done) { done = true; resolve(); } };
  child.once('close', finish);
  try { child.kill(signal); } catch { finish(); }
  setTimeout(finish, 5000);
});

(async () => {
  // wait for server to listen
  let up = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((res) => setTimeout(res, 300));
    try { await fetch(`http://localhost:${port}/api/stats`); up = true; break; } catch {}
  }
  if (!up) { console.error('SERVER DID NOT START\nSTDOUT:\n' + stdout + '\nSTDERR:\n' + stderr); await killAndWait(); process.exit(1); }

  const stats = await fetchJson(`http://localhost:${port}/api/stats`);
  const list = await fetchJson(`http://localhost:${port}/api/screenshots`);
  const tags = await fetchJson(`http://localhost:${port}/api/tags`);
  console.log('--- SMOKE TEST RESULTS ---');
  console.log('GET /api/stats   =>', stats.status, JSON.stringify(stats.body));
  console.log('GET /api/screenshots =>', list.status, JSON.stringify(list.body));
  console.log('GET /api/tags    =>', tags.status, JSON.stringify(tags.body));
  // clean up temp dir contents if possible (optional)
  await killAndWait();
  process.exit(0);
})().catch(async (e) => { console.error('SMOKE TEST ERROR', e, '\nSTDERR:\n', stderr); await killAndWait(); process.exit(1); });