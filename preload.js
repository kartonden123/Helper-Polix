const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  version: '1.3.0',
  ignore: (v) => ipcRenderer.send('ov-ignore', !!v),
  hide: () => ipcRenderer.send('ov-hide'),
  onShow: (cb) => ipcRenderer.on('ov-show', () => cb()),
  login: () => ipcRenderer.invoke('auth-login'),
  authState: () => ipcRenderer.invoke('auth-state')
});
