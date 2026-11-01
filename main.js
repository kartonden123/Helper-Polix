const { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'Памятка семьи Polix Creator - KATO';
const OPACITY = 1;             // полная непрозрачность окна: фон сайта не просвечивает
const WIDTH = 640;
const HEIGHT_RATIO = 0.9;
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
    x: workArea.x + workArea.width - w - 12,
    y: workArea.y + Math.round((workArea.height - h) / 2),
    width: w, height: h
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
    backgroundMaterial: 'acrylic',
    icon: path.join(__dirname, 'tray.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setOpacity(OPACITY);
  win.loadFile(path.join(__dirname, 'index.html'), { search: 'overlay' });

  win.webContents.on('did-finish-load', () => {
    try { win.webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8')); } catch (e) { log('css ' + e.message); }
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => log(`did-fail-load ${code} ${desc}`));
  win.once('ready-to-show', () => { win.show(); visible = true; });
  if (DEBUG) win.webContents.openDevTools({ mode: 'detach' });

  // закрытие окна = скрыть в трей, а не выход
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); hideWin(); }
  });
  win.on('closed', () => { win = null; });
}

function showWin() {
  if (!win) createWindow();
  win.show(); win.focus(); visible = true;
  updateTrayMenu();
}
function hideWin() {
  if (win) win.hide();
  visible = false;
  updateTrayMenu();
}
function toggle() { visible ? hideWin() : showWin(); }

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
    { label: 'Выйти полностью', click: quitApp }
  ]));
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupUpdater();
  const ok = globalShortcut.register(TOGGLE_KEY, toggle);
  log(`shortcut ${TOGGLE_KEY}: ${ok}`);
  app.on('activate', showWin);
}).catch(e => log('start error ' + e.stack));

app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
// не выходим, когда все окна скрыты: приложение живёт в трее
app.on('window-all-closed', () => { /* остаёмся в трее */ });
