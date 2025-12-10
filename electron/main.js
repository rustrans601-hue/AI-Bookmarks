const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple compatibility with the existing code structure
      webSecurity: false, // Disable built-in browser CORS checks
    },
    title: "AI Bookmark Manager",
    autoHideMenuBar: true,
  });

  const session = mainWindow.webContents.session;

  // 1. BLOCK GOOGLE TELEMETRY NOISE
  // Prevents ERR_CONNECTION_RESET errors in console
  session.webRequest.onBeforeRequest(
    { urls: ['*://play.google.com/*'] },
    (details, callback) => {
      callback({ cancel: true });
    }
  );

  // 2. INTERCEPT REQUESTS TO OLLAMA (Localhost)
  // Remove 'Origin' and 'Referer' headers to bypass Ollama's strict server-side origin check (403 Forbidden).
  const localUrls = [
    'http://localhost:*/*',
    'http://127.0.0.1:*/*',
    '*://localhost:*/*', 
    '*://127.0.0.1:*/*'
  ];

  session.webRequest.onBeforeSendHeaders(
    { urls: localUrls },
    (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      
      // Case-insensitive removal of Origin and Referer
      Object.keys(requestHeaders).forEach(k => {
        const lower = k.toLowerCase();
        if (lower === 'origin' || lower === 'referer') {
          delete requestHeaders[k];
        }
      });

      callback({ requestHeaders });
    }
  );

  // 3. INJECT CORS HEADERS (Response)
  // Ensure the browser receives permissive CORS headers for local requests, 
  // preventing "blocked by CORS policy" errors even if the server doesn't send them.
  session.webRequest.onHeadersReceived(
    { urls: localUrls },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Access-Control-Allow-Headers'] = ['*'];
      responseHeaders['Access-Control-Allow-Methods'] = ['*'];

      callback({ responseHeaders });
    }
  );

  // Check if we are in development mode (running via vite server)
  // or production mode (serving the built files).
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});