const { app, shell, safeStorage } = require('electron');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Публичные значения, секретов здесь нет (вход по PKCE без Client Secret).
const CLIENT_ID = '1566391859494912120';
const GUILD_ID = '1548704059601453056';
const ROLE_ID = '';                       // '' = достаточно быть на сервере; иначе нужна эта роль
const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ROLE_ID ? 'identify guilds guilds.members.read' : 'identify guilds';
const GRACE_MS = 24 * 60 * 60 * 1000;     // сколько можно работать без связи с Discord
const API = 'https://discord.com/api/v10';

const FILE = () => path.join(app.getPath('userData'), 'auth.json');
let state = { ok: false, user: null, reason: '' };
let server = null;
let accessToken = null;
const ADMIN_ID = '1041301544471113788';

const b64 = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (s) => (safeStorage.isEncryptionAvailable() ? 'e:' + safeStorage.encryptString(s).toString('base64') : 'p:' + s);
const dec = (s) => (s.startsWith('e:') ? safeStorage.decryptString(Buffer.from(s.slice(2), 'base64')) : s.slice(2));

function load() { try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch (e) { return null; } }
function save(d) { try { fs.writeFileSync(FILE(), JSON.stringify(d)); } catch (e) {} }

async function tokenRequest(params) {
  const r = await fetch(API + '/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params })
  });
  if (!r.ok) { const e = new Error('token ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
async function api(pathname, token) {
  const r = await fetch(API + pathname, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) { const e = new Error(pathname + ' ' + r.status); e.status = r.status; throw e; }
  return r.json();
}

// проверка: пользователь на сервере (и имеет роль, если задана)
async function verify(token) {
  const user = await api('/users/@me', token);
  const guilds = await api('/users/@me/guilds', token);
  if (!guilds.some(g => g.id === GUILD_ID)) return { ok: false, user, reason: 'Вы не состоите на сервере семьи.' };
  if (ROLE_ID) {
    const m = await api(`/users/@me/guilds/${GUILD_ID}/member`, token);
    if (!(m.roles || []).includes(ROLE_ID)) return { ok: false, user, reason: 'У вас нет нужной роли на сервере семьи.' };
  }
  return { ok: true, user, reason: '' };
}

function publicUser(u) { return u ? { id: u.id, name: u.global_name || u.username } : null; }

// повторная проверка по сохранённому refresh-токену
async function recheck() {
  const d = load();
  if (!d || !d.refresh) { state = { ok: false, user: null, reason: '' }; return state; }
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: dec(d.refresh) });
    const v = await verify(t.access_token);
    accessToken = t.access_token;
    save({ refresh: enc(t.refresh_token), user: publicUser(v.user), ok: v.ok, checkedAt: Date.now() });
    state = { ok: v.ok, user: publicUser(v.user), reason: v.reason };
  } catch (e) {
    if (e.status === 400 || e.status === 401 || e.status === 403) {
      state = { ok: false, user: d.user || null, reason: 'Сессия Discord истекла. Войдите снова.' };
      save({ ...d, refresh: '', ok: false });
    } else if (d.ok && Date.now() - (d.checkedAt || 0) < GRACE_MS) {
      state = { ok: true, user: d.user, reason: '' };   // нет связи: работаем по сохранённому результату
    } else {
      state = { ok: false, user: d.user || null, reason: 'Нет связи с Discord. Проверьте интернет.' };
    }
  }
  return state;
}

// вход через браузер: PKCE + локальный callback
function login() {
  return new Promise((resolve) => {
    if (server) { try { server.close(); } catch (e) {} server = null; }
    const verifier = b64(crypto.randomBytes(48));
    const challenge = b64(crypto.createHash('sha256').update(verifier).digest());
    const st = b64(crypto.randomBytes(16));
    let done = false;
    const finish = (s) => { if (done) return; done = true; clearTimeout(timer); try { server && server.close(); } catch (e) {} server = null; state = s; resolve(s); };
    const timer = setTimeout(() => finish({ ok: false, user: null, reason: 'Время входа истекло. Попробуйте снова.' }), 5 * 60 * 1000);

    server = http.createServer(async (req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      const page = (t) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<meta charset="utf-8"><body style="background:#0b0a0c;color:#fff;font:18px Segoe UI;text-align:center;padding-top:20vh">${t}<br><small style="color:#888">Это окно можно закрыть.</small>`); };
      if (u.searchParams.get('state') !== st || !u.searchParams.get('code')) {
        page('Вход отменён.'); finish({ ok: false, user: null, reason: 'Вход отменён.' }); return;
      }
      try {
        const t = await tokenRequest({ grant_type: 'authorization_code', code: u.searchParams.get('code'), redirect_uri: REDIRECT, code_verifier: verifier });
        const v = await verify(t.access_token);
        accessToken = t.access_token;
        save({ refresh: enc(t.refresh_token), user: publicUser(v.user), ok: v.ok, checkedAt: Date.now() });
        page(v.ok ? 'Готово! Вернитесь в Polix Helper.' : esc(v.reason));
        finish({ ok: v.ok, user: publicUser(v.user), reason: v.reason });
      } catch (e) {
        page('Ошибка входа.'); finish({ ok: false, user: null, reason: 'Ошибка входа: ' + e.message });
      }
    });
    server.on('error', (e) => finish({ ok: false, user: null, reason: 'Порт ' + PORT + ' занят: ' + e.code }));
    server.listen(PORT, '127.0.0.1', () => {
      const q = new URLSearchParams({
        client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT, scope: SCOPES,
        state: st, code_challenge: challenge, code_challenge_method: 'S256'
      });
      shell.openExternal('https://discord.com/oauth2/authorize?' + q);
    });
  });
}
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function logout() { save({ refresh: '', ok: false }); state = { ok: false, user: null, reason: '' }; return state; }
module.exports = { login, recheck, logout, get: () => ({ ...state, admin: !!(state.ok && state.user && state.user.id === ADMIN_ID) }), token: () => accessToken };
