const { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const auth = require('./auth');

const APP_NAME = 'Polix Helper';
const STATS_URL = 'https://polix-helper-stats.kartonden123.workers.dev';   // сервер статистики (Cloudflare Worker)
const OPACITY = 1;             // полная непрозрачность окна: фон сайта не просвечивает
const WIDTH = 760;
const HEIGHT_RATIO = 0.75;
const SIDE = 'right';          // 'right' или 'top'
const TOGGLE_KEY = 'Alt+Q';
const DEBUG = false;           // true: лог и DevTools

let win = null;
let tray = null;
let visible = true;
let quitting = false;
let updateState = 'Обновления: не проверялись';

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
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { updateState = 'Проверка обновлений…'; updateTrayMenu(); });
  autoUpdater.on('update-available', (i) => { updateState = `Скачивается версия ${i.version}…`; updateTrayMenu(); });
  autoUpdater.on('update-not-available', () => { updateState = 'Установлена последняя версия'; updateTrayMenu(); });
  autoUpdater.on('download-progress', (p) => { updateState = `Скачивание: ${Math.round(p.percent)}%`; updateTrayMenu(); });
  autoUpdater.on('update-downloaded', (i) => {
    updateState = `Версия ${i.version} готова`;
    updateTrayMenu();
    dialog.showMessageBox({
      type: 'info', buttons: ['Перезапустить сейчас', 'Позже'], defaultId: 0,
      title: APP_NAME, message: `Доступна версия ${i.version}`,
      detail: 'Перезапустить программу, чтобы установить обновление?'
    }).then(r => { if (r.response === 0) { quitting = true; autoUpdater.quitAndInstall(); } });
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
ipcMain.handle('auth-state', () => auth.get());
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
