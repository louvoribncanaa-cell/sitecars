const http = require('http');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const PATHS = ['/', '/healthz', '/nao-existe'];

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE + path, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

(async () => {
  for (const p of PATHS) {
    const r = await get(p);
    const ok = p === '/' ? r.status === 200 && r.body.includes('DriveElite') : p === '/healthz' ? r.status === 200 : r.status === 404;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${p} -> ${r.status}`);
    if (!ok) process.exitCode = 1;
  }
  const home = await get('/');
  console.log(`     CSP: ${home.headers['content-security-policy'] ? 'present' : 'absent'}`);
  console.log(`     Cache-Control: ${home.headers['cache-control']}`);
})();
