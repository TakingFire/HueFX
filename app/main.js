const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');

// Enables native File System Access API
app.commandLine.appendSwitch("enable-experimental-web-platform-features");

let mainWindow = null;
let tray = null;

// Sent from renderer
let useTray = false;
let lights = {};

ipcMain.on('tray', function(e, args) {
  useTray = args.enabled;
  lights = args.lights
});

function trayIcon(archetype = '') {
  let icon;
  switch (archetype) {
    case 'sultanbulb':
      icon = 'sultanbulb.png';
      break;
    case 'huelightstrip':
      icon = 'huelightstrip.png';
      break;
    case 'hueplay':
      icon = 'hueplay.png';
      break;
    case 'huebloom':
    case 'hueiris':
    case 'tablewash':
    case 'huego':
      icon = 'huebloom.png';
      break;
    case 'groundspot':
    case 'wallspot':
    case 'singlespot':
    case 'doublespot':
      icon = 'spot.png';
      break;
    default:
      icon = 'default.png';
  }
  return path.resolve(__dirname, './resources/tray_icons/', icon);
}

function createTray() {
  if (tray) { tray.destroy() }
  let appIcon = new Tray(path.resolve(__dirname, './resources/icon.png'));

  const lightMenu = [];

  for (key in lights) {
    const light = lights[key];
    let item = {
      icon: trayIcon(light.info.config.archetype),
      label: light.info.name,
      type: 'normal',
      click: function() { mainWindow.webContents.send('toggleLight', light.id) },
    }
    lightMenu.push(item);
  };

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', type: 'normal', click: function() { mainWindow.restore() } },
    { label: 'Lights', type: 'submenu', submenu: Menu.buildFromTemplate(lightMenu) },
    { label: 'Exit', type: 'normal', role: 'quit' }
  ]);

  appIcon.setToolTip('HueFX');
  appIcon.setContextMenu(contextMenu);
  appIcon.on('click', function(event) { mainWindow.show() });
  return appIcon;
}

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
    height: 558,
    minHeight: 364,
    maxHeight: 800,
    frame: false,
    transparent: true,
  });

  win.loadFile(path.resolve(__dirname, 'index.html'));

  win.on('close', function(e) {
    win.webContents.send('close');
  });


  win.on('minimize', function(e) {
    if (useTray) {
      win.setSkipTaskbar(true);
      tray = createTray();
    }
  });

  win.on('restore', function(e) {
    if (useTray) {
      win.setSkipTaskbar(false);
      tray.destroy();
    }
  });

  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) { mainWindow = createWindow() };
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
