const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  version: '2.0.0',
  ignore: (v) => ipcRenderer.send('ov-ignore', !!v),
  hide: () => ipcRenderer.send('ov-hide'),
  resize: (h) => ipcRenderer.send('ov-resize', h),
  setOpacity: (v) => ipcRenderer.send('ov-opacity', v),
  setPosition: (s) => ipcRenderer.send('ov-position', s),
  onShow: (cb) => ipcRenderer.on('ov-show', () => cb()),
  login: () => ipcRenderer.invoke('auth-login'),
  authState: () => ipcRenderer.invoke('auth-state'),
  onUpdate: (cb) => ipcRenderer.on('update-state', (_e, s) => cb(s)),
  updateState: () => ipcRenderer.invoke('update-state'),
  updateAction: (a) => ipcRenderer.send('update-action', a),
  aiAsk: (q, c) => ipcRenderer.invoke('ai-ask', q, c),
  aiLeft: () => ipcRenderer.invoke('ai-left'),
  staffApi: (method, p, body) => ipcRenderer.invoke('staff-api', method, p, body),
  adminUsers: () => ipcRenderer.invoke('admin-users'),
  adminPremium: (id, on) => ipcRenderer.invoke('admin-premium', id, on)
});
