import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Add any safe APIs here
    // e.g. platform: process.platform
});
