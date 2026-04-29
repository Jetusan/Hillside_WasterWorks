import { app, BrowserWindow } from 'electron';
import path from 'path';
import dotenv from 'dotenv';

// ✅ Load dotenv FIRST - before any other imports that might use environment variables
dotenv.config({path: path.join(process.cwd(), '.env')});

import { initDatabase } from './database';
import { registerAllHandlers } from './ipc';

app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

console.log('🚀 Main process starting...');

async function createWindow(): Promise<void> {
    // ✅ Initialize database FIRST
    await initDatabase();
    console.log('✅ Database initialized');
    
    // ✅ NOW register handlers (services will have access to DB)
    registerAllHandlers();
    console.log('✅ IPC handlers registered');
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        title: 'Hillside Water Works System',
        autoHideMenuBar: true,  
        icon: path.join(process.cwd(), 'public', 'hillside_official_logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.center();
    mainWindow.focus();
    mainWindow.show();

    if (process.env.NODE_ENV === 'development') {
        const port = process.env.APP_PORT || 3000;
        mainWindow.loadURL(`http://localhost:${port}`);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
    console.log('✅ Window created!');
}

app.whenReady().then(() => {
    console.log('📱 App ready!');
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});