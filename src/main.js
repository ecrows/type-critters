const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#e8e0f0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // Let the renderer handle Escape for the session summary.
  // The renderer sends 'quit-app' via IPC when it's truly time to close.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      // Prevent default Escape behavior; renderer handles it
      event.preventDefault();
      win.webContents.send('escape-pressed');
    }
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
