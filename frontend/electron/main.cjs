const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

const BACKEND_PORT = 5174;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Register custom protocol 'eris://' for OAuth deep links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('eris', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('eris');
}

let pendingDeepLink = null;

// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      const deepLink = commandLine.find((arg) => typeof arg === 'string' && arg.startsWith('eris://'));
      if (deepLink) {
        mainWindow.webContents.send('auth:deep-link', deepLink);
      }
    }
  });
}

// macOS open-url handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('auth:deep-link', url);
  } else {
    pendingDeepLink = url;
  }
});

function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/system/check-env`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const isUp = await checkBackendHealth();
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function killBackendProcess() {
  if (backendProcess && backendProcess.pid) {
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${backendProcess.pid} /T /F`);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('Error terminating backend process:', err);
    }
    backendProcess = null;
  }
  // Ensure no orphaned backend processes linger
  if (process.platform === 'win32') {
    try {
      exec('taskkill /IM eris_backend.exe /F /T');
    } catch { }
  }
}

function parseEnvFile(filePath) {
  const fs = require('fs');
  const envVars = {};
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envVars[key] = val;
        }
      }
    } catch (e) {
      console.warn('[Electron] Could not parse env file:', filePath, e);
    }
  }
  return envVars;
}

async function startBackendIfNecessary() {
  const alreadyRunning = await checkBackendHealth();
  if (alreadyRunning) {
    console.log('[Electron] Backend is already running on port', BACKEND_PORT);
    return;
  }

  console.log('[Electron] Spawning ERIS backend...');
  const rootDir = path.resolve(__dirname, '..', '..');

  // Discover and merge .env credentials if present (in development mode)
  const candidateEnvPaths = [
    path.join(process.resourcesPath, 'backend', '.env'),
    path.join(rootDir, '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  let parsedEnv = {};
  for (const envPath of candidateEnvPaths) {
    const loaded = parseEnvFile(envPath);
    if (Object.keys(loaded).length > 0) {
      parsedEnv = { ...parsedEnv, ...loaded };
    }
  }

  const mergedEnv = {
    ...process.env,
    ...parsedEnv,
    ERIS_NO_BROWSER: '1',
  };

  if (app.isPackaged) {
    // Production: execute packaged eris_backend binary
    const backendDir = path.join(process.resourcesPath, 'backend');
    const exePath = path.join(backendDir, 'eris_backend.exe');
    const fs = require('fs');
    let logStream = 'ignore';
    try {
      const logDir = app.getPath('userData');
      const out = fs.openSync(path.join(logDir, 'backend.log'), 'a');
      logStream = out;
    } catch (e) {
      try {
        const out = fs.openSync(path.join(backendDir, 'backend.log'), 'a');
        logStream = out;
      } catch (errFallback) {
        console.warn('[Electron] Could not open backend.log, falling back to ignore:', e);
      }
    }

    backendProcess = spawn(exePath, ['--no-window'], {
      cwd: backendDir,
      detached: false,
      stdio: ['ignore', logStream, logStream],
      windowsHide: true,
      env: mergedEnv,
    });
  } else {
    // Development: launch via project virtualenv
    const pythonExe = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
    const runScript = path.join(rootDir, 'backend', 'run.py');
    backendProcess = spawn(pythonExe, [runScript, '--no-window'], {
      cwd: rootDir,
      detached: false,
      stdio: 'inherit',
      windowsHide: false,
      env: mergedEnv,
    });
  }

  backendProcess.on('error', (err) => {
    console.error('[Electron] Failed to start backend:', err);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    fullscreen: true,          // Launch directly into hardware fullscreen
    simpleFullscreen: true,    // macOS seamless fullscreen support
    autoHideMenuBar: true,     // Hide menu bar entirely
    frame: false,              // Frameless for pure edge-to-edge immersion
    show: false,               // Keep hidden until backend & layout settle
    backgroundColor: '#080A10',
    title: 'ERIS',
    icon: path.join(__dirname, '..', 'public', 'icons', 'eris_logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Reveal window smoothly after the first frame paints to eliminate animation stutter
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(true);
      setTimeout(() => {
        mainWindow.show();
        mainWindow.focus();
      }, 100);
    }
  });

  // Handle external link navigation safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Window close behavior: cleanly terminate application so it never runs in background
  mainWindow.on('close', () => {
    isQuitting = true;
    killBackendProcess();
  });

  // Intercept mouse hardware back/forward buttons (MB4 / MB5)
  mainWindow.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward') {
      e.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('eris:mouse-navigate', 'back');
      }
    } else if (cmd === 'browser-forward') {
      e.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('eris:mouse-navigate', 'forward');
      }
    }
  });

  // Purge Chromium navigation history so SPA cannot be navigated away from & lock fullscreen
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.clearHistory();
      if (!mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(true);
      }
      if (pendingDeepLink) {
        mainWindow.webContents.send('auth:deep-link', pendingDeepLink);
        pendingDeepLink = null;
      }
    }
  });

  // Directly load ERIS application URL once backend is ready
  const loadApp = async () => {
    const isReady = await waitForBackend(40);
    if (isReady && mainWindow && !mainWindow.isDestroyed()) {
      try {
        await mainWindow.loadURL(BACKEND_URL);
      } catch (err) {
        console.warn('[Electron] Failed to load URL, retrying in 1.5s...', err);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(BACKEND_URL).catch(() => { });
          }
        }, 1500);
      }
    } else if (!isReady) {
      console.error('[Electron] Backend failed to initialize within timeout window.');
      dialog.showErrorBox(
        'ERIS Core Initialization Error',
        'ERIS Backend server failed to start or did not respond on 127.0.0.1:5174 within 20 seconds.\n\n' +
        'Troubleshooting:\n' +
        '1. Ensure port 5174 is not in use by another program.\n' +
        '2. Check Windows Defender / Antivirus settings.\n' +
        '3. Check logs at: ' + path.join(app.getPath('userData'), 'backend.log')
      );
      isQuitting = true;
      killBackendProcess();
      app.quit();
    }
  };
  loadApp();
}

function createSystemTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'icons', 'eris_logo.png');
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open ERIS',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      { label: 'Status: Online', enabled: false },
      { type: 'separator' },
      {
        label: 'Quit ERIS',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('ERIS - Autonomous AI Pair Programmer');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Electron] Could not initialize tray:', err);
  }
}

// IPC Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('window-close', () => {
  isQuitting = true;
  killBackendProcess();
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

ipcMain.on('app-quit', () => {
  isQuitting = true;
  killBackendProcess();
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Workspace Folder',
  });
  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('shell:openExternal', async (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Google OAuth PKCE Handler (Zero .env dependency in prod release)
ipcMain.handle('auth:google-login', async (event, clientIdFromUI) => {
  const crypto = require('crypto');
  const https = require('https');

  const clientId = clientIdFromUI || process.env.GOOGLE_CLIENT_ID || '171365330842-ji7le8khuhv3ovcnv289s445rl2j7853.apps.googleusercontent.com';
  // Read clientSecret from environment if available
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.send',
  ].join(' ');

  function base64UrlEncode(buffer) {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function postForm(urlStr, dataObj) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlStr);
      const postData = new URLSearchParams(dataObj).toString();

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error_description || parsed.error || raw));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${raw}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  function getJson(urlStr, bearerToken) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlStr);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  return new Promise((resolve, reject) => {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );

    let assignedPort = null;
    let redirectUri = '';
    let isHandled = false;

    const server = http.createServer(async (req, res) => {
      // Discard secondary browser requests like /favicon.ico
      if (!req.url.startsWith('/?') && req.url !== '/' && !req.url.includes('code=')) {
        res.writeHead(404);
        res.end();
        return;
      }

      if (isHandled) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('Authentication completed. You can close this tab.');
        return;
      }

      try {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${assignedPort}`);
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          isHandled = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h3 style="font-family:sans-serif;text-align:center;margin-top:40px;">Authentication canceled. You can close this window.</h3>');
          server.close();
          reject(new Error(error));
          return;
        }

        if (code) {
          isHandled = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h3 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#2563eb;">Authentication successful! You can close this tab and return to ERIS.</h3>');

          const tokenPayload = {
            client_id: clientId,
            code: code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          };

          if (clientSecret) {
            tokenPayload.client_secret = clientSecret;
          }

          const tokenData = await postForm('https://oauth2.googleapis.com/token', tokenPayload);

          const profileData = await getJson(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            tokenData.access_token
          );

          server.close();

          resolve({
            tokens: tokenData,
            profile: profileData,
          });
        }
      } catch (err) {
        isHandled = true;
        try {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h3 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#dc2626;">Authentication error. Please retry from ERIS.</h3>');
        } catch { }
        server.close();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      assignedPort = addr.port;
      redirectUri = `http://127.0.0.1:${assignedPort}`;

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&access_type=offline` +
        `&prompt=consent`;

      shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
});

// App Lifecycle
app.whenReady().then(async () => {
  await startBackendIfNecessary();
  createMainWindow();
  createSystemTray();

  globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  globalShortcut.register('F11', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  killBackendProcess();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});