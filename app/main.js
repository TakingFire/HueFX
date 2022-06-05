const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    },
    width: 400,
    minWidth: 400,
    maxWidth: 500,
    height: 570,
    minHeight: 364,
    maxHeight: 800,
    frame: false,
    transparent: true,
  });

  win.loadFile(path.resolve(__dirname, 'index.html'));

  win.on('close', function(e) {
    win.webContents.send('close');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
})

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
