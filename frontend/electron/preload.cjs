const { contextBridge, ipcRenderer } = require('electron');

// Comprehensive desktop bridge interface
const api = {
  isElectron: true,
  platform: process.platform,

  // Window management
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  quit: () => ipcRenderer.send('app-quit'),
  quitApp: () => ipcRenderer.send('app-quit'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // Generic IPC invoke & Google PKCE login handler
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  googleLogin: (clientId) => ipcRenderer.invoke('auth:google-login', clientId),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Deep linking for Supabase OAuth (eris://auth/callback)
  onAuthDeepLink: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('auth:deep-link', handler);
    return () => ipcRenderer.removeListener('auth:deep-link', handler);
  },

  // Hardware mouse navigation controls (MB4 / MB5)
  onMouseNavigate: (callback) => {
    const handler = (_event, direction) => callback(direction);
    ipcRenderer.on('eris:mouse-navigate', handler);
    return () => ipcRenderer.removeListener('eris:mouse-navigate', handler);
  },
};

// Expose on both namespaces to ensure all frontend components work reliably
contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('electron', api);