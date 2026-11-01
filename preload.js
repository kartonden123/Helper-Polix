const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  version: '1.4.2',
  ignore: (v) => ipcRenderer.send('ov-ignore', !!v),
  hide: () => ipcRenderer.send('ov-hide'),
  resize: (h) => ipcRenderer.send('ov-resize', h),
  onShow: (cb) => ipcRenderer.on('ov-show', () => cb()),
  login: () => ipcRenderer.invoke('auth-login'),
  authState: () => ipcRenderer.invoke('auth-state'),
  adminUsers: () => ipcRenderer.invoke('admin-users')
});
