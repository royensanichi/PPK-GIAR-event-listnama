'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'giar';
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'members.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]\n');
let members = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
if (!Array.isArray(members)) throw new Error('Invalid members.json');
const sessions = new Map();
const attempts = new Map();
const MAX_BODY = 4096;
const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function save() {
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(members, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}
function json(res, code, object, extras = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extras });
  res.end(JSON.stringify(object));
}
function getSession(req) {
  const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('ppk_admin='))?.slice(10);
  if (!token) return null;
  const expires = sessions.get(token);
  if (!expires) return null;
  if (Date.now() > expires) { sessions.delete(token); return null; }
  return token;
}
async function readJson(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > MAX_BODY) { const err = new Error('Data terlalu panjang.'); err.status = 413; throw err; }
  }
  try { return JSON.parse(text || '{}'); } catch { const err = new Error('Format data tidak valid.'); err.status = 400; throw err; }
}
function cleanName(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}
function secureEqual(a, b) {
  const aa = crypto.createHash('sha256').update(a).digest();
  const bb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aa, bb);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    if (pathname.startsWith('/api/')) {
      if (req.method === 'GET' && pathname === '/api/members') {
        return json(res, 200, { members: members.map(({ id, name }) => ({ id, name })) });
      }
      if (req.method === 'POST' && pathname === '/api/members') {
        const body = await readJson(req);
        const name = cleanName(body.name);
        if (name.length < 3 || name.length > 80 || /[<>\x00-\x1f\x7f]/.test(name)) return json(res, 400, { error: 'Nama harus 3–80 karakter dan tidak boleh memakai simbol < atau >.' });
        if (members.some(m => m.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'))) return json(res, 409, { error: 'Nama tersebut sudah terdaftar.' });
        members.push({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
        save();
        return json(res, 201, { message: 'Pendaftaran berhasil!', count: members.length });
      }
      if (req.method === 'POST' && pathname === '/api/admin/login') {
        const ip = req.socket.remoteAddress || 'unknown';
        const state = attempts.get(ip) || { failures: 0, lockedUntil: 0 };
        if (Date.now() < state.lockedUntil) return json(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit.' });
        const body = await readJson(req);
        if (typeof body.password !== 'string' || !secureEqual(body.password, ADMIN_PASSWORD)) {
          state.failures++;
          if (state.failures >= 8) { state.lockedUntil = Date.now() + 5 * 60_000; state.failures = 0; }
          attempts.set(ip, state);
          return json(res, 401, { error: 'Password salah.' });
        }
        attempts.delete(ip);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + 8 * 60 * 60_000);
        const secure = (req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
        return json(res, 200, { message: 'Login berhasil.' }, { 'Set-Cookie': `ppk_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}` });
      }
      if (req.method === 'GET' && pathname === '/api/admin/status') return json(res, 200, { authenticated: !!getSession(req) });
      if (req.method === 'POST' && pathname === '/api/admin/logout') {
        const session = getSession(req);
        if (session) sessions.delete(session);
        return json(res, 200, { message: 'Logout berhasil.' }, { 'Set-Cookie': 'ppk_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (req.method === 'DELETE' && pathname.startsWith('/api/admin/members/')) {
        if (!getSession(req)) return json(res, 401, { error: 'Silakan login sebagai admin.' });
        // Strict cookie + same-origin header check for mutation.
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin tidak diizinkan.' });
        const id = pathname.slice('/api/admin/members/'.length);
        const i = members.findIndex(m => m.id === id);
        if (i < 0) return json(res, 404, { error: 'Nama tidak ditemukan.' });
        members.splice(i, 1);
        save();
        return json(res, 200, { message: 'Nama telah dihapus.', count: members.length });
      }
      return json(res, 404, { error: 'Endpoint tidak ditemukan.' });
    }
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Metode tidak diizinkan.' });
    const routes = { '/': 'index.html', '/index.html': 'index.html', '/admin': 'admin.html', '/admin.html': 'admin.html', '/style.css': 'style.css', '/app.js': 'app.js', '/admin.js': 'admin.js', '/logo-gia.png': 'logo-gia.png' };
    const filename = routes[pathname];
    if (!filename) { res.writeHead(404); return res.end('Not found'); }
    const filepath = path.join(PUBLIC, filename);
    const ext = path.extname(filepath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(filepath).pipe(res);
  } catch (err) {
    console.error(err);
    return json(res, err.status || 500, { error: err.status ? err.message : 'Terjadi kesalahan pada server.' });
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`HUT PPK 23 running: http://localhost:${PORT}`));
