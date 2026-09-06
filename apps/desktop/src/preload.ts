import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('skb', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  quit: () => ipcRenderer.invoke('app:quit'),
});

export {};