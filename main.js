const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const OPACITY = 0.9;          // прозрачность окна (0..1)
const WIDTH = 640;            // ширина оверлея в пикселях
const HEIGHT_RATIO = 0.9;    // высота относительно экрана
const SIDE = 'right';         // 'right' или 'top'
const TOGGLE_KEY = 'Alt+Q';

let win = null;
let visible = true;

function placeWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const h = Math.round(workArea.height * HEIGHT_RATIO);
  let x, y, w, hh;
  if (SIDE === 'top') {
    w = Math.round(workArea.width * 0.6); hh = 150;
    x = workArea.x + Math.round((workArea.width - w) / 2);
    y = workArea.y + 12;
  } else {
    w = WIDTH; hh = h;
    x = workArea.x + workArea.width - w - 12;
    y = workArea.y + Math.round((workArea.height - hh) / 2);
  }
  return { x, y, width: w, height: hh };
}

function createWindow() {
  win = new BrowserWindow({
    ...placeWindow(),
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
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
  win.loadFile(path.join(__dirname, 'index.html'), { search: 'overlay' });

  win.webContents.on('did-finish-load', () => {
    const css = fs.readFileSync(path.join(__dirname, 'overlay.css'), 'utf8');
    win.webContents.insertCSS(css);
  });

  win.on('closed', () => { win = null; });
}

function toggle() {
  if (!win) return;
  if (visible) { win.hide(); visible = false; }
  else { win.showInactive(); win.focus(); visible = true; }
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register(TOGGLE_KEY, toggle);
  app.on('activate', () => { if (!win) createWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
