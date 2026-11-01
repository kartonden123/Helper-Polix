const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  version: '1.1.0',
  ignore: (v) => ipcRenderer.send('ov-ignore', !!v),
  hide: () => ipcRenderer.send('ov-hide'),
  onShow: (cb) => ipcRenderer.on('ov-show', () => cb())
});
