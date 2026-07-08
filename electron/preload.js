

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('botAPI', {
    start: () => ipcRenderer.invoke("twitchBot:start"),
    stop: () => ipcRenderer.invoke("twitchBot:stop"),
    restart: () => ipcRenderer.invoke("twitchBot:restart"),
    status: () => ipcRenderer.invoke("twitchBot:status"),
    saveCommand: (data) => ipcRenderer.invoke('twitch:saveCommand', data),
});

contextBridge.exposeInMainWorld("dataAPI", {

    saveData(data) {

        return ipcRenderer.invoke(
            "save-data",
            data
        );

    },

    getData() {

        return ipcRenderer.invoke(
            "get-data"
        );

    }

});