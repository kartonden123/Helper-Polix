const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const OPACITY = 0.9;
const WIDTH = 640;
const HEIGHT_RATIO = 0.9;
const SIDE = 'right';            // 'right' или 'top'
const TOGGLE_KEY = 'Alt+Q';
const DEBUG = true;              // true: лог в файл и DevTools

let win = null;
let visible = true;

const LOG = path.join(app.getPath('userData'), 'overlay.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch (e) {}
  console.log(line.trim());
}

function placeWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  if (SIDE === 'top') {
    const w = Math.round(workArea.width * 0.6), h = 150;
    return { x: workArea.x + Math.round((workArea.width - w) / 2), y: workArea.y + 12, width: w, height: h };
  }
  const h = Math.round(workArea.height * HEIGHT_RATIO);
  const w = WIDTH;
  return {
    x: workArea.x + workArea.width - w - 12,
    y: workArea.y + Math.round((workArea.height - h) / 2),
    width: w, height: h
  };
}

function createWindow() {
  const bounds = placeWindow();
  log(`start, bounds=${JSON.stringify(bounds)}, file=${path.join(__dirname, 'index.html')}`);

  win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,          // true скрывает кнопку в панели задач, для отладки оставим видимой
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setOpacity(OPACITY);

  win.webContents.on('did-fail-load', (_e, code, desc) => log(`did-fail-load ${code} ${desc}`));
  win.webContents.on('render-process-gone', (_e, d) => log(`render-process-gone ${JSON.stringify(d)}`));
  win.webContents.on('console-message', (_e, lvl, msg) => log(`page console: ${msg}`));

  win.loadFile(path.join(__dirname, 'index.html'), { search: 'overlay' });

  win.webContents.on('did-finish-load', () => {
    log('page loaded');
    try {
      const css = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');
      win.webContents.insertCSS(css);
    } catch (e) { log('css error ' + e.message); }
  });

  // показать сразу после отрисовки, а не молча
  win.once('ready-to-show', () => {
    log('ready-to-show');
    win.show();
    win.focus();
  });

  if (DEBUG) win.webContents.openDevTools({ mode: 'detach' });

  win.on('closed', () => { win = null; });
}

function toggle() {
  if (!win) { createWindow(); visible = true; return; }
  if (visible) { win.hide(); visible = false; }
  else { win.show(); win.focus(); visible = true; }
  log(`toggle -> ${visible ? 'shown' : 'hidden'}`);
}

app.whenReady().then(() => {
  log('app ready');
  createWindow();
  const ok = globalShortcut.register(TOGGLE_KEY, toggle);
  log(`shortcut ${TOGGLE_KEY} registered: ${ok}`);
  app.on('activate', () => { if (!win) createWindow(); });
}).catch(e => log('whenReady error ' + e.stack));

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
