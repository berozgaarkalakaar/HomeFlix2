const { app, BrowserWindow, shell } = require('electron');
import path from 'path';

let mainWindow: any = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        backgroundColor: '#141414', // Match dark theme
    });

    if (isDev) {
        // In dev, load the Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In prod, load the built index.html from the web app
        // We assume apps/web is built to apps/web/dist
        // Since this is a monorepo, we can access sibling dirs
        // But for electron-builder, we usually want to bundle it. 
        // For MVP, loading the verified URL is easier if we host it, 
        // but for a standalone desktop app, we usually copy the build.
        // Let's assume for this MVP we load the local dev URL or a local file if users run `build`.

        mainWindow.loadFile(path.join(__dirname, 'web', 'index.html'));
    }

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
