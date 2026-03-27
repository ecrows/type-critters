const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onEscapePressed: (callback) => ipcRenderer.on('escape-pressed', callback),
  quitApp: () => ipcRenderer.send('quit-app'),
});
