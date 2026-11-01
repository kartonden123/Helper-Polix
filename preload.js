const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  version: '1.6.0',
  ignore: (v) => ipcRenderer.send('ov-ignore', !!v),
  hide: () => ipcRenderer.send('ov-hide'),
  resize: (h) => ipcRenderer.send('ov-resize', h),
  setOpacity: (v) => ipcRenderer.send('ov-opacity', v),
  setPosition: (s) => ipcRenderer.send('ov-position', s),
  onShow: (cb) => ipcRenderer.on('ov-show', () => cb()),
  login: () => ipcRenderer.invoke('auth-login'),
  authState: () => ipcRenderer.invoke('auth-state'),
  adminUsers: () => ipcRenderer.invoke('admin-users'),
  adminPremium: (id, on) => ipcRenderer.invoke('admin-premium', id, on)
});
