const { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const auth = require('./auth');

const APP_NAME = 'Polix Helper';
const STATS_URL = 'https://polix-helper-stats.kartonden123.workers.dev';   // сервер статистики (Cloudflare Worker)
const OPACITY = 1;             // полная непрозрачность окна: фон сайта не просвечивает
const WIDTH = 880;
const HEIGHT_RATIO = 0.75;
const SIDE = 'right';          // 'right' или 'top'
const TOGGLE_KEY = 'Alt+Q';
const DEBUG = false;           // true: лог и DevTools

let win = null;
let tray = null;
let visible = true;
let quitting = false;
let updateState = 'Обновления: не проверялись';
let lastUpdate = null;
let declinedVersion = null;
function startDownload() {
  const v = (lastUpdate && lastUpdate.version) || '';
  pushUpdate({ type: 'downloading', version: v, percent: 0 });
  autoUpdater.downloadUpdate().catch(e => { log('download error ' + e.message); pushUpdate({ type: 'available', version: v }); });
}
function pushUpdate(s) { lastUpdate = s; if (win && !win.isDestroyed()) win.webContents.send('update-state', s); }

// один экземпляр: второй запуск просто показывает окно
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => showWin());

const LOG = path.join(app.getPath('userData'), 'overlay.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch (e) {}
}

function placeWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  if (SIDE === 'top') {
    const w = Math.round(workArea.width * 0.6), h = 150;
    return { x: workArea.x + Math.round((workArea.width - w) / 2), y: workArea.y + 12, width: w, height: h };
  }
  const h = Math.round(workArea.height * HEIGHT_RATIO), w = WIDTH;
  return {
    x: workArea.x + Math.round((workArea.width - w) / 2),
    y: workArea.y + Math.round(workArea.height * 0.12),
    width: w, height: 160
  };
}

function createWindow() {
  win = new BrowserWindow({
    ...placeWindow(),
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'tray.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setOpacity(OPACITY);
  loadContent();

  win.webContents.on('did-fail-load', (_e, code, desc) => log(`did-fail-load ${code} ${desc}`));
  win.once('ready-to-show', () => { win.show(); visible = true; });
  if (DEBUG) win.webContents.openDevTools({ mode: 'detach' });

  // закрытие окна = скрыть в трей, а не выход
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); hideWin(); }
  });
  win.on('closed', () => { win = null; });
}

function loadContent() {
  if (!win) return;
  win.loadFile(path.join(__dirname, auth.get().ok ? 'index.html' : 'login.html'));
}

function showWin() {
  if (!win) createWindow();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.show(); win.focus(); win.webContents.focus(); visible = true;
  win.webContents.send('ov-show');
  updateTrayMenu();
}
function hideWin() {
  if (win) win.hide();
  visible = false;
  updateTrayMenu();
}
function toggle() {
  const shown = !!(win && win.isVisible());
  log(`toggle: was ${shown ? 'visible' : 'hidden'}`);
  shown ? hideWin() : showWin();
}

function quitApp() {
  quitting = true;
  if (tray) { tray.destroy(); tray = null; }
  app.quit();
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.on('click', toggle);
  tray.on('double-click', showWin);
  updateTrayMenu();
}


// ---------- автообновление ----------
function setupUpdater() {
  if (!app.isPackaged) { updateState = 'Обновления: режим разработки'; return; }
  autoUpdater.autoDownload = false;   // сначала спрашиваем пользователя
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { updateState = 'Проверка обновлений…'; updateTrayMenu(); });
  autoUpdater.on('update-available', (i) => {
    updateState = `Доступна версия ${i.version}`;
    updateTrayMenu();
    if (declinedVersion === i.version) { pushUpdate({ type: 'none', version: i.version, later: true, avail: true }); return; }
    pushUpdate({ type: 'available', version: i.version });
    showWin();
  });
  autoUpdater.on('update-not-available', () => { updateState = 'Установлена последняя версия'; updateTrayMenu(); });
  autoUpdater.on('download-progress', (p) => { updateState = `Скачивание: ${Math.round(p.percent)}%`; pushUpdate({ type: 'downloading', version: (lastUpdate && lastUpdate.version) || '', percent: p.percent }); updateTrayMenu(); });
  autoUpdater.on('update-downloaded', (i) => {
    updateState = `Версия ${i.version} готова`;
    pushUpdate({ type: 'ready', version: i.version });
    updateTrayMenu();
    showWin();
  });
  autoUpdater.on('error', (e) => { updateState = 'Ошибка обновления'; log('updater error ' + e.message); updateTrayMenu(); });
  checkUpdates();
  setInterval(checkUpdates, 3 * 60 * 60 * 1000);
}
function checkUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdates().catch(e => log('check error ' + e.message));
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: visible ? 'Скрыть' : 'Показать', click: toggle },
    { label: `Горячая клавиша: Alt+Q`, enabled: false },
    { label: updateState, enabled: false },
    ...(lastUpdate && lastUpdate.later && lastUpdate.avail ? [{ label: 'Скачать обновление ' + lastUpdate.version, click: () => startDownload() }] : []),
    ...(lastUpdate && lastUpdate.later && !lastUpdate.avail ? [{ label: 'Установить обновление ' + lastUpdate.version, click: () => { quitting = true; autoUpdater.quitAndInstall(); } }] : []),
    { label: 'Проверить обновления', click: checkUpdates },
    { type: 'separator' },
    { label: 'Выйти из Discord', click: () => { auth.logout(); loadContent(); showWin(); } },
    { label: 'Выйти полностью', click: quitApp }
  ]));
}

ipcMain.on('ov-resize', (_e, h) => {
  if (!win || !(h > 0)) return;
  const max = Math.round(screen.getPrimaryDisplay().workArea.height * 0.9);
  const [w] = win.getContentSize();
  win.setContentSize(w, Math.min(Math.max(Math.round(h), 80), max));
});
ipcMain.on('ov-hide', () => hideWin());
// ИИ-помощник: запрос идёт на сервер статистики, там проверяются Discord-аккаунт и дневной лимит
ipcMain.handle('ai-ask', async (_e, question, context) => {
  const t = auth.token();
  if (!t || !auth.get().ok) return { error: 'auth', message: 'Войдите через Discord, чтобы пользоваться ИИ.' };
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 45000);
    const r = await fetch(STATS_URL + '/ai', { method: 'POST', signal: ctl.signal, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
    clearTimeout(to);
    return await r.json();
  } catch (e) { log('ai error ' + e.message); return { error: 'net', message: 'Нет связи с сервером ИИ. Вопрос не списан.' }; }
});
ipcMain.handle('ai-left', async () => {
  const t = auth.token(); if (!t || !auth.get().ok) return null;
  try { const r = await fetch(STATS_URL + '/ai/left', { headers: { Authorization: 'Bearer ' + t } }); return await r.json(); } catch (e) { return null; }
});
ipcMain.handle('update-state', () => lastUpdate);
ipcMain.on('update-action', (_e, a) => {
  const u = lastUpdate || {};
  if (a === 'download' && (u.type === 'available' || u.avail)) startDownload();
  else if (a === 'install' && u.type === 'ready') { quitting = true; autoUpdater.quitAndInstall(); }
  else if (a === 'later') {
    if (u.type === 'available') { declinedVersion = u.version; pushUpdate({ type: 'none', version: u.version, later: true, avail: true }); }
    else if (u.type === 'ready') pushUpdate({ type: 'none', version: u.version, later: true });
    updateTrayMenu();
  }
});
ipcMain.on('ov-opacity', (_e, v) => { if (win && v >= 0.3 && v <= 1) win.setOpacity(v); });
ipcMain.on('ov-position', (_e, side) => {
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea; const b = win.getBounds();
  const x = side === 'left' ? wa.x + 12 : side === 'right' ? wa.x + wa.width - b.width - 12 : wa.x + Math.round((wa.width - b.width) / 2);
  win.setPosition(x, b.y);
});
// Premium: статус приходит с сервера (у автора всегда включён), последний ответ хранится на случай отсутствия сети
const PREMIUM_FILE = () => path.join(app.getPath('userData'), 'premium.json');
let me = { premium: false, role: '', banned: false, announce: null };
try { me = { ...me, ...JSON.parse(fs.readFileSync(PREMIUM_FILE(), 'utf8')) }; } catch (e) {}
async function refreshMe() {
  const t = auth.token();
  if (!t || !auth.get().ok) { if (!auth.get().ok) me = { premium: false, role: '', banned: false, announce: null }; return; }
  try {
    const r = await fetch(STATS_URL + '/me', { headers: { Authorization: 'Bearer ' + t } });
    if (r.ok) {
      const d = await r.json();
      me = { premium: !!d.premium, role: d.role || '', banned: !!d.banned, announce: d.announce || null };
      try { fs.writeFileSync(PREMIUM_FILE(), JSON.stringify(me)); } catch (e) {}
    }
  } catch (e) { log('me error ' + e.message); }
}
ipcMain.handle('auth-state', async () => {
  await refreshMe();
  const s = auth.get();
  const role = s.ok ? (s.admin ? 'owner' : me.role) : '';
  return { ...s, role, staff: !!role, premium: !!(s.ok && (role || me.premium)), banned: !!(s.ok && me.banned && !s.admin), announce: s.ok ? me.announce : null };
});
// панель персонала и список «В сети»: права проверяет сервер
ipcMain.handle('staff-api', async (_e, method, apiPath, body) => {
  const t = auth.token();
  if (!t || !auth.get().ok) return { error: 'Войдите через Discord' };
  if (!/^\/(staff\/[a-z]+|online)(\?id=\d{5,25})?$/.test(apiPath)) return { error: 'bad path' };
  try {
    const r = await fetch(STATS_URL + apiPath, { method: method === 'POST' ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body || {}) : undefined });
    const d = await r.json();
    if (!r.ok && !d.error) d.error = 'Ошибка ' + r.status;
    return d;
  } catch (e) { return { error: 'Нет связи с сервером' }; }
});ipcMain.handle('admin-premium', async (_e, id, on) => {
  const t = auth.token();
  if (!t || !auth.get().admin) return { error: 'forbidden' };
  try {
    const r = await fetch(STATS_URL + '/admin/premium', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, on: !!on }) });
    return await r.json();
  } catch (e) { return { error: 'Нет связи с сервером' }; }
});
// статистика: сообщаем серверу, что человек пользуется хелпером
async function ping() {
  const t = auth.token();
  if (!t || !auth.get().ok || false) return;
  try {
    await fetch(STATS_URL + '/ping', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ version: app.getVersion() }) });
  } catch (e) { log('ping error ' + e.message); }
}
// админ-панель: сервер сам проверяет, что это ваш Discord ID
ipcMain.handle('admin-users', async () => {
  const t = auth.token();
  if (!t || !auth.get().admin) return { error: 'forbidden' };
  try {
    const r = await fetch(STATS_URL + '/admin/users', { headers: { Authorization: 'Bearer ' + t } });
    return await r.json();
  } catch (e) { return { error: 'Нет связи с сервером статистики' }; }
});
ipcMain.handle('auth-login', async () => {
  const s = await auth.login();
  log('auth login: ' + s.ok + ' ' + (s.reason || ''));
  if (s.ok) { loadContent(); ping(); }
  showWin();
  return s;
});
async function recheckAuth() {
  const was = auth.get().ok;
  const s = await auth.recheck();
  log('auth recheck: ' + s.ok + ' ' + (s.reason || ''));
  if (s.ok) ping();
  if (was !== s.ok) { loadContent(); if (!s.ok) showWin(); }
}

app.whenReady().then(async () => {
  await auth.recheck();
  createWindow();
  setInterval(recheckAuth, 3 * 60 * 60 * 1000);
  ping();
  setInterval(ping, 20 * 60 * 1000);
  createTray();
  setupUpdater();
  const keys = [TOGGLE_KEY, 'Control+Alt+Q'];
  const regKeys = () => keys.forEach(k => {
    if (globalShortcut.isRegistered(k)) return;
    const ok = globalShortcut.register(k, toggle);
    if (ok) log(`shortcut ${k}: true`);
  });
  regKeys();
  log(`shortcut ${TOGGLE_KEY}: ${globalShortcut.isRegistered(TOGGLE_KEY)}`);
  // если клавишу держала другая программа, пробуем снова
  setInterval(regKeys, 5000);
  app.on('activate', showWin);
}).catch(e => log('start error ' + e.stack));

app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
// не выходим, когда все окна скрыты: приложение живёт в трее
app.on('window-all-closed', () => { /* остаёмся в трее */ });
