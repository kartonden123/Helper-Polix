const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('overlay', { version: '1.0.0' });
