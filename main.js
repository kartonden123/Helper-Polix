const { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, dialog, ipcMain, Notification, desktopCapturer } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const auth = require('./auth');

const APP_NAME = 'Polix Helper';
const STATS_URL = 'https://polix-helper-stats.kartonden123.workers.dev';   // сервер статистики (Cloudflare Worker)
const OPACITY = 1;             // полная непрозрачность окна: фон сайта не просвечивает
const WIDTH = 940;
const HEIGHT_RATIO = 0.75;
const SIDE = 'right';          // 'right' или 'top'
const TOGGLE_KEY = 'Alt+Q';
let STARTED_HIDDEN = process.argv.includes('--hidden');   // запуск вместе с Windows: сидим в трее, меню открывается по Alt+Q
const DEBUG = false;           // true: лог и DevTools

const PREFS_FILE = path.join(app.getPath('userData'), 'ui-prefs.json');
const readPrefs = () => { try { return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8')); } catch (e) { return {}; } };
// размытие фона (Ультра): при открытии меню делаем снимок экрана, он размывается и подкладывается только под плашки
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
// уведомление: своё маленькое окно поверх игры (системные уведомления Windows глушатся в полноэкранных играх и режиме «Не беспокоить»)
const toasts = [];
const TOAST_ICON = { update: '⬇', role: '🛡', premium: '⭐', ban: '⛔', announce: '📢', chat: '💬', info: '🔔' };
function showToast(title, body, kind) {
  try {
    const wa = screen.getPrimaryDisplay().workArea;
    const W = 388, H = 120, gap = 0;
    const y = wa.y + wa.height - (H - 28 + 12) * (toasts.length + 1) - 6;
    const tw = new BrowserWindow({ width: W, height: H, x: wa.x + wa.width - W - 14, y, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, focusable: false, show: false, resizable: true, hasShadow: false, backgroundColor: '#00000000', webPreferences: { contextIsolation: true } });
    const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden;font:13px "Segoe UI",system-ui,sans-serif;color:#fff;user-select:none;cursor:pointer}
.c{margin:14px;height:${H - 28}px;box-sizing:border-box;display:flex;gap:12px;align-items:center;padding:0 16px;border-radius:16px;background:linear-gradient(180deg,#221f27,#16141a);border:1px solid #ff4d6d;box-shadow:0 3px 10px rgba(0,0,0,.45);animation:in .35s cubic-bezier(.2,.9,.3,1.1) both}
i{font-style:normal;font-size:26px}b{display:block;font-size:14px;margin-bottom:2px}span{color:#cfc8d3;font-size:12px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
@keyframes in{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}</style>
<div class="c" onclick="document.title='click'"><i>${TOAST_ICON[kind] || TOAST_ICON.info}</i><div><b>${esc(title)}</b><span>${esc(body)}</span></div></div>`;
    tw.setAlwaysOnTop(true, 'screen-saver');
    tw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    tw.once('ready-to-show', () => tw.showInactive());
    tw.webContents.on('page-title-updated', (_e, t) => { if (t === 'click') { showWin(); if (!tw.isDestroyed()) tw.close(); } });
    toasts.push(tw);
    const done = () => { const i = toasts.indexOf(tw); if (i >= 0) toasts.splice(i, 1); };
    tw.on('closed', done);
    setTimeout(() => { if (!tw.isDestroyed()) tw.close(); }, 8000);
  } catch (e) { log('toast error ' + e.message); }
}
function notify(title, body, kind) {
  showToast(title, body, kind);
  if (win && !win.isDestroyed()) win.webContents.send('notice', { title, body, kind: kind || 'info', silent: true });
}
ipcMain.handle('notify-test', () => { notify('Проверка уведомлений', 'Если вы видите это окно, уведомления работают.', 'info'); return true; });let notifiedUpdate = null;
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
  win.on('blur', () => { if (readPrefs().autohide && win && !win.isDestroyed() && win.isVisible() && !quitting) setTimeout(() => { if (win && !win.isDestroyed() && !win.isFocused()) hideWin(); }, 150); });
  win.on('moved', () => { if (win && !win.isDestroyed()) snapInfo().then((i) => { if (i && win && !win.isDestroyed()) win.webContents.send('ov-bounds', i); }); });
  win.on('closed', () => { win = null; });
}

function loadContent() {
  if (!win) return;
  win.loadFile(path.join(__dirname, auth.get().ok ? 'index.html' : 'login.html'));
}

const snapAllowed = () => !!(auth.get().ok && (auth.get().admin || me.tier === 'ultra'));
const snapOn = () => !!readPrefs().snap && snapAllowed();
// Живое размытие: само меню получает видеопоток экрана (как демонстрация экрана) и рисует его под плашками на GPU.
// Окно хелпера исключено из захвата (защита содержимого), поэтому оно не размывает само себя.
let screenIds = {};
async function snapInfo() {
  if (!win || win.isDestroyed()) return null;
  const b = win.getBounds();
  const d = screen.getDisplayNearestPoint({ x: b.x + 40, y: b.y + 40 });
  if (!screenIds[d.id]) {
    // перечисление экранов у Windows медленное (около 2 секунд), поэтому делаем один раз и запоминаем
    const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 }, fetchWindowIcons: false });
    const src = srcs.find((s) => String(s.display_id) === String(d.id)) || srcs[0];
    screenIds[d.id] = src && src.id;
  }
  return { id: screenIds[d.id] || null, b, disp: d.bounds };
}
function applyProtection() { try { if (win && !win.isDestroyed()) win.setContentProtection(snapOn()); } catch (e) {} }
function showWin() {
  if (!win) createWindow();
  const was = win.isVisible();
  win.setAlwaysOnTop(true, 'screen-saver');
  // окно показываем невидимым: меню сначала сбрасывает состояние и подгоняет размер, потом плавно проявляется (без «прыжка» старого кадра)
  if (!was) win.setOpacity(0);
  applyProtection();
  win.show(); win.focus(); win.webContents.focus(); visible = true;
  win.webContents.send('ov-show');
  if (!was) setTimeout(() => { if (win && !win.isDestroyed()) win.setOpacity(1); }, 300);
  updateTrayMenu();
}
function hideWin() {
  if (win) win.hide();
  visible = false;
  updateTrayMenu();
}function toggle() {
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
  setInterval(watchRelease, 45 * 1000);
}
// как только GitHub отдаёт новый latest.yml (сборка готова), сразу запрашиваем обновление
let remoteSeen = null;
const vnum = (v) => String(v).split('.').map((x) => parseInt(x, 10) || 0);
const newer = (a, b) => { const x = vnum(a), y = vnum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
async function watchRelease() {
  if (!app.isPackaged) return;
  try {
    const r = await fetch('https://github.com/kartonden123/Helper-Polix/releases/latest/download/latest.yml', { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) return;
    const m = /^version:\s*([\d.]+)/m.exec(await r.text());
    if (m && m[1] !== remoteSeen) { remoteSeen = m[1]; if (newer(m[1], app.getVersion())) checkUpdates(); }
  } catch (e) {}
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
ipcMain.on('ov-blur', (_e, on) => {
  if (!snapAllowed()) return;   // только Ультра Премиум
  try { fs.writeFileSync(PREFS_FILE, JSON.stringify({ ...readPrefs(), snap: !!on })); } catch (e) {}
  applyProtection();
  if (win && !win.isDestroyed()) win.webContents.send('snap-changed', !!on);
});
ipcMain.handle('snap-info', () => snapInfo());ipcMain.handle('ui-prefs', () => ({ snap: snapOn(), autohide: !!readPrefs().autohide }));
ipcMain.on('ov-autohide', (_e, on) => { try { fs.writeFileSync(PREFS_FILE, JSON.stringify({ ...readPrefs(), autohide: !!on })); } catch (e) {} });
ipcMain.on('ov-opacity', (_e, v) => { if (win && v >= 0.3 && v <= 1) win.setOpacity(v); });
ipcMain.on('ov-position', (_e, side) => {
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea; const b = win.getBounds();
  const x = side === 'left' ? wa.x + 12 : side === 'right' ? wa.x + wa.width - b.width - 12 : wa.x + Math.round((wa.width - b.width) / 2);
  win.setPosition(x, b.y);
  snapInfo().then((i) => { if (i && win && !win.isDestroyed()) win.webContents.send('ov-bounds', i); });
});
// Premium: статус приходит с сервера (у автора всегда включён), последний ответ хранится на случай отсутствия сети
const PREMIUM_FILE = () => path.join(app.getPath('userData'), 'premium.json');
let me = { roles: [], premium: false, tier: '', role: '', banned: false, announce: null };
try { me = { ...me, ...JSON.parse(fs.readFileSync(PREMIUM_FILE(), 'utf8')) }; } catch (e) {}
let meKnown = (() => { try { const j = JSON.parse(fs.readFileSync(PREMIUM_FILE(), 'utf8')); return Array.isArray(j.roles) && j.tier !== undefined; } catch (e) { return false; } })();
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
let lastPushAt = 0;
async function refreshMe() {
  const t = auth.token();
  if (!t || !auth.get().ok) { if (!auth.get().ok) me = { roles: [], premium: false, tier: '', role: '', banned: false, announce: null }; return; }
  try {
    const r = await fetch(STATS_URL + '/me', { headers: { Authorization: 'Bearer ' + t } });
    if (r.ok) {
      const d = await r.json();
      if (Date.now() - lastPushAt < 90000) return;   // свежие данные из мгновенного канала важнее задержанного ответа KV
      const nm = { roles: d.roles || [], premium: !!d.premium, tier: d.tier || (d.premium ? 'premium' : ''), role: d.role || '', banned: !!d.banned, announce: d.announce || null };
      if (meKnown) diffMe(me, nm, !!d.admin);
      meKnown = true; me = nm;
      try { fs.writeFileSync(PREMIUM_FILE(), JSON.stringify(me)); } catch (e) {}
    }
  } catch (e) { log('me error ' + e.message); }
}
function applyPatch(p) {
  lastPushAt = Date.now();
  const nm = { ...me, ...p };
  if (p.announce === undefined) nm.announce = me.announce;
  const owner = !!auth.get().admin;
  if (meKnown) diffMe(me, nm, owner);
  me = nm; meKnown = true;
  try { fs.writeFileSync(PREMIUM_FILE(), JSON.stringify(me)); } catch (e) {}
  if (win && !win.isDestroyed()) win.webContents.send('me-changed');
}
// ---------- мгновенный канал: чат и уведомления (WebSocket) ----------
let ws = null, wsTimer = null, wsDelay = 3000, wsPing = null, chatHist = [];
function wsSend(o) { try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } } catch (e) {} return false; }
function connectWs() {
  clearTimeout(wsTimer);
  const t = auth.token();
  if (!t || !auth.get().ok || (ws && ws.readyState <= 1)) return;
  let WS; try { WS = require('ws'); } catch (e) { log('ws missing'); return; }
  try {
    ws = new WS(STATS_URL.replace(/^http/, 'ws') + '/ws', { headers: { Authorization: 'Bearer ' + t } });
  } catch (e) { wsTimer = setTimeout(connectWs, wsDelay); return; }
  ws.on('open', () => { wsDelay = 3000; clearInterval(wsPing); wsPing = setInterval(() => wsSend({ t: 'ping' }), 40000); log('ws open'); });
  ws.on('message', (d) => {
    let m; try { m = JSON.parse(String(d)); } catch (e) { return; }
    const myId = auth.get().user && auth.get().user.id;
    if (m.t === 'hist') { chatHist = m.m || []; if (win && !win.isDestroyed()) win.webContents.send('chat', { t: 'hist', m: chatHist }); }
    else if (m.t === 'chat') {
      chatHist.push(m.m); if (chatHist.length > 100) chatHist.shift();
      if (win && !win.isDestroyed()) win.webContents.send('chat', m);
      if (m.m.uid !== myId && !(win && win.isVisible())) showToast(m.m.name, m.m.text, 'chat');
    }
    else if (m.t === 'del') { chatHist = chatHist.filter((x) => x.id !== m.id); if (win && !win.isDestroyed()) win.webContents.send('chat', m); }
    else if (m.t === 'user' && m.id === myId) applyPatch({ role: m.role || '', roles: m.roles || [], tier: m.tier || '', premium: !!m.premium, banned: !!m.banned });
    else if (m.t === 'announce') applyPatch({ announce: m.a || null });
    else if (m.t === 'err' && win && !win.isDestroyed()) win.webContents.send('chat', m);
  });
  const again = () => { clearInterval(wsPing); ws = null; wsTimer = setTimeout(connectWs, wsDelay); wsDelay = Math.min(60000, wsDelay * 2); };
  ws.on('close', again);
  ws.on('error', (e) => { log('ws error ' + e.message); });
}
ipcMain.handle('chat-hist', () => chatHist);
ipcMain.handle('chat-send', (_e, text) => wsSend({ t: 'chat', text: String(text || '').slice(0, 300) }));
ipcMain.handle('chat-del', (_e, id) => wsSend({ t: 'del', id: String(id) }));
ipcMain.handle('auth-state', async (_e, fast) => {
  if (!fast) await refreshMe();
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
  connectWs(); setInterval(connectWs, 15000);
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
