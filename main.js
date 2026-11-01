const { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, dialog, ipcMain, Notification, desktopCapturer } = require('electron');
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
const STARTED_HIDDEN = process.argv.includes('--hidden');   // запуск вместе с Windows: сидим в трее, меню открывается по Alt+Q
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

app.setAppUserModelId('dev.majestic.catalog.overlay');
// уведомление: системное (Windows) и всплывающая плашка в самом меню
function notify(title, body, kind) {
  try { if (Notification.isSupported()) { const n = new Notification({ title, body, icon: path.join(__dirname, 'logo.png'), silent: false }); n.on('click', () => showWin()); n.show(); } } catch (e) { log('notify error ' + e.message); }
  if (win && !win.isDestroyed()) win.webContents.send('notice', { title, body, kind: kind || 'info' });
}
let notifiedUpdate = null;
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
  win.once('ready-to-show', () => { if (STARTED_HIDDEN && auth.get().ok) { visible = false; updateTrayMenu(); } else { win.show(); visible = true; } });
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
  // окно показываем невидимым: меню сначала сбрасывает состояние и подгоняет размер, потом плавно проявляется (без «прыжка» старого кадра)
  const was = win.isVisible();
  if (!was) win.setOpacity(0);
  win.show(); win.focus(); win.webContents.focus(); visible = true;
  win.webContents.send('ov-show');
  if (!was) setTimeout(() => { if (win && !win.isDestroyed()) win.setOpacity(1); }, 300);
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
    if (notifiedUpdate !== i.version) { notifiedUpdate = i.version; notify('Доступно обновление', 'Polix Helper ' + i.version + ' готов к скачиванию. Откройте меню (Alt+Q).', 'update'); }
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
  setInterval(checkUpdates, 10 * 60 * 1000);
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
ipcMain.on('ov-ready', () => { if (win && !win.isDestroyed()) win.setOpacity(1); });
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
// ручная проверка из настроек
ipcMain.handle('update-check', async () => {
  if (!app.isPackaged) return { state: 'dev', current: app.getVersion() };
  declinedVersion = null;
  try {
    const r = await autoUpdater.checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    if (v && v !== app.getVersion() && (!lastUpdate || lastUpdate.type === 'none' || !lastUpdate.type)) pushUpdate({ type: 'available', version: v });
    const cur = lastUpdate && lastUpdate.type && lastUpdate.type !== 'none' ? lastUpdate : null;
    return cur ? { state: cur.type, version: cur.version, current: app.getVersion() } : { state: 'latest', current: app.getVersion() };
  } catch (e) { return { state: 'error', current: app.getVersion() }; }
});
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
// автозапуск с Windows (по умолчанию включён при первом запуске) и размытие фона (Ультра Премиум)
const AUTOSTART_FLAG = () => path.join(app.getPath('userData'), 'autostart-init');
function setAutostart(on) { if (!app.isPackaged) return; try { app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] }); } catch (e) { log('autostart error ' + e.message); } }
ipcMain.handle('autostart-get', () => (app.isPackaged ? app.getLoginItemSettings().openAtLogin : false));
ipcMain.handle('autostart-set', (_e, on) => { setAutostart(on); return app.isPackaged ? app.getLoginItemSettings().openAtLogin : false; });
// снимок экрана для режима покера (только Главный Администратор и роль ДПВ); файл остаётся у пользователя на компьютере
ipcMain.handle('poker-shot', async () => {
  if (!(auth.get().admin || (me.roles || []).includes('dpv'))) return { error: 'forbidden' };
  try {
    const wasVisible = !!(win && win.isVisible());
    if (wasVisible) win.setOpacity(0);
    await new Promise(r => setTimeout(r, 200));
    const d = screen.getPrimaryDisplay(); const sf = d.scaleFactor || 1;
    const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(d.size.width * sf), height: Math.round(d.size.height * sf) } });
    if (wasVisible) win.setOpacity(1);
    const img = srcs[0] && srcs[0].thumbnail; if (!img || img.isEmpty()) return { error: 'empty' };
    const dir = path.join(app.getPath('userData'), 'poker-shots'); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'shot-' + Date.now() + '.png'); fs.writeFileSync(file, img.toPNG());
    return { path: file };
  } catch (e) { if (win) win.setOpacity(1); log('shot error ' + e.message); return { error: 'fail' }; }
});
ipcMain.on('ov-blur', (_e, on) => { try { if (win && typeof win.setBackgroundMaterial === 'function') win.setBackgroundMaterial(on ? 'acrylic' : 'none'); } catch (e) { log('blur error ' + e.message); } });
ipcMain.on('ov-opacity', (_e, v) => { if (win && v >= 0.3 && v <= 1) win.setOpacity(v); });
ipcMain.on('ov-position', (_e, side) => {
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea; const b = win.getBounds();
  const x = side === 'left' ? wa.x + 12 : side === 'right' ? wa.x + wa.width - b.width - 12 : wa.x + Math.round((wa.width - b.width) / 2);
  win.setPosition(x, b.y);
});
// Premium: статус приходит с сервера (у автора всегда включён), последний ответ хранится на случай отсутствия сети
const PREMIUM_FILE = () => path.join(app.getPath('userData'), 'premium.json');
let me = { roles: [], premium: false, tier: '', role: '', banned: false, announce: null };
try { me = { ...me, ...JSON.parse(fs.readFileSync(PREMIUM_FILE(), 'utf8')) }; } catch (e) {}
let meKnown = fs.existsSync(PREMIUM_FILE());
const RN_RU = { owner: 'Главный Администратор', admin: 'Зам. Администратор', jr: 'Мл. Администратор', smod: 'Ст. Модератор', mod: 'Модератор' };
function diffMe(a, b, isOwner) {
  if (isOwner) { if (b.announce && (!a.announce || a.announce.id !== b.announce.id)) { /* свои объявления не показываем */ } return; }
  if (a.role !== b.role) {
    if (b.role) notify('Вам назначена роль', RN_RU[b.role] || b.role, 'role');
    else notify('Роль снята', 'Вы больше не ' + (RN_RU[a.role] || 'сотрудник').toLowerCase(), 'role');
  }
  if (a.tier !== b.tier && !a.role && !b.role) {
    if (b.tier === 'ultra') notify('Вам выдан Ультра Премиум', 'Открыты все функции: размытие фона, свой цвет, ИИ 100 вопросов в день.', 'premium');
    else if (b.tier === 'premium') notify(a.tier === 'ultra' ? 'Ультра Премиум снят' : 'Вам выдан Premium', a.tier === 'ultra' ? 'Остался обычный Premium.' : 'Открыты калькулятор дела, избранное, заметки, таймеры и настройки.', 'premium');
    else notify(a.tier === 'ultra' ? 'Ультра Премиум снят' : 'Premium снят', 'Дополнительные функции отключены.', 'premium');
  }
  const ap = (a.roles || []).includes('dpv'), bp = (b.roles || []).includes('dpv');
  if (!ap && bp) notify('Вам выдана роль ДПВ', 'Открыт режим покера (кнопка ♠).', 'role');
  if (ap && !bp) notify('Роль ДПВ снята', 'Режим покера отключён.', 'role');
  if (!a.banned && b.banned) notify('Доступ ограничен', 'Администратор заблокировал вам доступ к хелперу.', 'ban');
  if (a.banned && !b.banned) notify('Доступ восстановлен', 'Блокировка снята.', 'ban');
  if (b.announce && b.announce.text && (!a.announce || a.announce.id !== b.announce.id)) notify('Объявление', b.announce.text, 'announce');
}
async function refreshMe() {
  const t = auth.token();
  if (!t || !auth.get().ok) { if (!auth.get().ok) me = { roles: [], premium: false, tier: '', role: '', banned: false, announce: null }; return; }
  try {
    const r = await fetch(STATS_URL + '/me', { headers: { Authorization: 'Bearer ' + t } });
    if (r.ok) {
      const d = await r.json();
      const nm = { roles: d.roles || [], premium: !!d.premium, tier: d.tier || (d.premium ? 'premium' : ''), role: d.role || '', banned: !!d.banned, announce: d.announce || null };
      if (meKnown) diffMe(me, nm, !!d.admin);
      meKnown = true; me = nm;
      try { fs.writeFileSync(PREMIUM_FILE(), JSON.stringify(me)); } catch (e) {}
    }
  } catch (e) { log('me error ' + e.message); }
}
ipcMain.handle('auth-state', async () => {
  await refreshMe();
  const s = auth.get();
  const role = s.ok ? (s.admin ? 'owner' : me.role) : '';
  return { ...s, role, roles: s.ok ? (s.admin ? ['owner'] : (me.roles || [])) : [], staff: !!role, premium: !!(s.ok && (role || me.premium)), tier: !s.ok ? '' : (s.admin ? 'ultra' : (me.tier || (role || me.premium ? 'premium' : ''))), banned: !!(s.ok && me.banned && !s.admin), announce: s.ok ? me.announce : null };
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
  setTimeout(refreshMe, 20000);
  setInterval(refreshMe, 3 * 60 * 1000);
  createTray();
  if (app.isPackaged && !fs.existsSync(AUTOSTART_FLAG())) { setAutostart(true); try { fs.writeFileSync(AUTOSTART_FLAG(), '1'); } catch (e) {} }
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
