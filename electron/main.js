//Node
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

//Electron
const { app, BrowserWindow, ipcMain, dialog, Notification, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');

//Services
const { TwitchBotManager } = require('./TwitchBotManager');

//Utils


//Storage
const { SimpleSecureStorage } = require('../storage/secureStorage');


let mainWindow;

const simpleStorage = new SimpleSecureStorage();
const twitchManager = new TwitchBotManager(simpleStorage);

const preloadPath = path.join(__dirname, 'preload.js');


app.whenReady().then(() => {
    createWindow();
    setupIPC();

    console.log("Версия приложения:", app.getVersion());

    autoUpdater.checkForUpdatesAndNotify();
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 1000,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        return { action: 'allow' };
    });

    mainWindow.setMenu(null);

    mainWindow.loadFile('./electron/index.html');

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

}

function setupIPC() {

    ipcMain.handle('twitchBot:start', async () => {
        await twitchManager.start();
        return { success: true, message: 'Bot started' };
    });

    ipcMain.handle('twitchBot:stop', async () => {
         try {
            await twitchManager.stop();
            return {
                success: true,
                message: "Bot successfully stopped"
            };
        } catch (err) {
            return {
                success: false,
                message: err.message
            };
        }
    });

    ipcMain.handle('twitchBot:restart', async () => {
        await twitchManager.restart();
        return { success: true };
    });

    ipcMain.handle('twitchBot:status', async () => {
        return twitchManager.status();
    });

    ipcMain.handle("twitch:saveCommand", async (event, data) => {
        const config = simpleStorage.store.load();

        if (!config.twitch) {
            config.twitch = {};
        }

        if (!config.twitch.commands) {
            config.twitch.commands = {};
        }

        config.twitch.commands[data.command] = data.text;

        simpleStorage.store.save(config);

        if (twitchManager.bot?.commandHandler) {
            twitchManager.bot.commandHandler.reloadDynamicCommands();
        }

        return { success: true };
    });

    ipcMain.handle("save-data", async (event, data) => {
        console.log("save-data вызван");
        console.log(data);

        const current = simpleStorage.store.load();const result = {
        ...current,
        ...data
        };

        simpleStorage.store.save(result);

        console.log("Сохранено в", simpleStorage.store.filePath);

        return { success: true };
    });

    ipcMain.handle("get-data", async () => {
        return {
            success: true,
            data: simpleStorage.store.load()
        };
    });

}

autoUpdater.on("checking-for-update", () => {
    console.log("Проверяем обновление...");
});

autoUpdater.on('update-available', async (info) => {
    const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Обновление',
        message: `Доступна новая версия ${info.version}`,
        buttons: ['Скачать', 'Позже'],
        defaultId: 1,
        cancelId: 1
    });

    if (result.response === 0) {
        autoUpdater.downloadUpdate();
    }
});

autoUpdater.on("update-not-available", () => {
    console.log("Обновлений нет");
});

autoUpdater.on("download-progress", progress => {
    console.log(progress.percent);
});

autoUpdater.on('update-downloaded', async () => {
    const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: 'Обновление загружено. Перезапустить приложение сейчас?',
        buttons: ['Перезапустить', 'Позже'],
        defaultId: 1,
        cancelId: 1
    });

    if (result.response === 0) {
        autoUpdater.quitAndInstall();
    }
});

autoUpdater.on("error", error => {
    console.log(error);
});