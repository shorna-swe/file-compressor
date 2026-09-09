const electron = require("electron");

electron.contextBridge.exposeInMainWorld("invoke", (...args) => {
    return electron.ipcRenderer.invoke(...args);
});

electron.contextBridge.exposeInMainWorld("on", (channel, callback) => {
    electron.ipcRenderer.on(channel, (event, data) => {
        callback(data);
    });
});