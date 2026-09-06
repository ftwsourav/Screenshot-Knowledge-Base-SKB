import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const API_URL = process.env.SKB_API_URL || 'http://localhost:5656';
const WEB_URL = process.env.SKB_WEB_URL || 'http://localhost:3000';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

interface ImportResult {
  success: boolean;
  screenshotId?: string;
  duplicate?: boolean;
  error?: string;
}

interface FileImportEntry extends ImportResult {
  path: string;
}

async function importFileToServer(filePath: string): Promise<ImportResult> {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const blob = new Blob([buf], { type });
    const form = new FormData();
    form.append('file', blob, path.basename(filePath));
    const res = await fetch(`${API_URL}/api/import`, { method: 'POST', body: form });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return (await res.json()) as ImportResult;
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

async function watchFolderOnServer(folderPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/import/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return (await res.json()) as { success: boolean; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

let mainWindow: BrowserWindow | null = null;

async function openAndImportFiles(): Promise<{ success: boolean; canceled?: boolean; results?: FileImportEntry[]; error?: string }> {
  if (!mainWindow) return { success: false, error: 'No window' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Screenshots',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
  const results: FileImportEntry[] = [];
  for (const p of result.filePaths) {
    results.push({ path: p, ...(await importFileToServer(p)) });
  }
  return { success: true, results };
}

async function openAndWatchFolder(): Promise<{ success: boolean; error?: string; path?: string; canceled?: boolean }> {
  if (!mainWindow) return { success: false, error: 'No window' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder to Watch',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
  const fp = result.filePaths[0];
  const r = await watchFolderOnServer(fp);
  return { ...r, path: fp };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(WEB_URL);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Screenshot…',
          click: async () => {
            await openAndImportFiles();
          },
        },
        {
          label: 'Watch Folder…',
          click: async () => {
            await openAndWatchFolder();
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SKB',
          click: async () => {
            await dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About SKB',
              message: 'Screenshot Knowledge Base',
              detail: 'Local-first screenshot search.\n\nOCR + FTS + tags.\nAll processing happens locally.',
            });
          },
        },
        {
          label: 'Open GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFile', async () => openAndImportFiles());
  ipcMain.handle('dialog:openFolder', async () => openAndWatchFolder());
  ipcMain.handle('app:quit', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});