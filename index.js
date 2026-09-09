const electron = require("electron");
const path = require("path");
const helper = require("./tools.js");

let selectedFolder = "";

electron.app.whenReady().then(() => {

    const win = new electron.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    electron.ipcMain.handle("select-folder", () => {
        const dir = electron.dialog.showOpenDialogSync({
            properties: ["openDirectory"]
        });

        if (dir) {
            selectedFolder = dir[0];
            return selectedFolder;
        }

        return null;
    });

    electron.ipcMain.handle("start-compression", () => {

        if (!selectedFolder) {
            throw new Error("Please select a folder first");
        }

        const cm = helper.createAndStartCompression(selectedFolder);

        cm.onProgress((progress) => {
            win.webContents.send("compression-progress", progress);
        });

        cm.onError((error) => {
            win.webContents.send("compression-error", error.message);
        });

        return true;
    });

    win.loadFile(
        path.join(__dirname, "helper-htmls", "compressor.html")
    );
});