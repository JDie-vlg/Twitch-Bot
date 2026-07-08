
const selectEl = document.getElementById('botSelect');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

const twitchClientID = document.getElementById('inputTwitchClientID');
const twitchClientSecret = document.getElementById('inputTwitchClientSecret');
const twitchChannelName = document.getElementById('inputTwitchChannelName');
const twitchBtn = document.getElementById('twitch-btn');

startBtn.addEventListener('click', async () => {
    const mode = selectEl.value;

    if (!mode) {
        statusDiv.textContent = ' Выберите вариант запуска';
        statusDiv.style.color = 'orange';
        return;
    }

    const config = {};

    if (mode.includes('twitch')) {
        config.twitch = {
            clientID: twitchClientID.value.trim(),
            clientSecret: twitchClientSecret.value.trim(),
            channelName: twitchChannelName.value.trim()
        };

        const result = await window.botAPI.start();

        if (result.success) {
            statusDiv.textContent = `✅ ${result.message}`;
            statusDiv.style.color = 'green';
            stopBtn.disabled = false;
        } else {
            statusDiv.textContent = `❌ ${result.message}`;
            statusDiv.style.color = 'red';
            window.botAPI.stop();
        }

        if (config.twitch && (!config.twitch.channelName || !config.twitch.clientID || !config.twitch.clientSecret)) {
            statusDiv.textContent = '❌ Заполните все поля для Twitch';
            statusDiv.style.color = 'red';
            return;
        }

        statusDiv.textContent = '⏳ Запуск...';
        startBtn.disabled = true;

        setInterval(async () => {
            const status = await window.botAPI.status();
            statusDiv.textContent = status;
        }, 1000);


        startBtn.disabled = false;
    }
});

stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    const result = await window.botAPI.stop();

    statusDiv.textContent = `🛑 ${result.message}`;
    statusDiv.style.color = 'gray';
    stopBtn.disabled = false;
});

selectEl.addEventListener('change', () => {
    const value = selectEl.value;

    document.getElementById('twitch').style.display = value.includes('twitch') ? 'block' : 'none';
});

twitchBtn.addEventListener("click", async () => {


    const data = {

        twitch: {
            clientID: twitchClientID.value,
            clientSecret: twitchClientSecret.value,
            channelName: twitchChannelName.value
        }
    };

    await window.dataAPI.saveData(data);

});

document.getElementById("twitch-command-btn").addEventListener("click", async () => {

    const command = document.getElementById("twitchCommand").value.trim();
    const text = document.getElementById("command-text").value.trim();

    if (!command || !text) return;

    await window.botAPI.saveCommand({
        command,
        text
    });

    document.getElementById("twitchCommand").value = "";
    document.getElementById("command-text").value = "";

    command.focus();

});

window.addEventListener("DOMContentLoaded", async () => {

    const result = await window.dataAPI.getData();

    const data = result.data;

    twitchClientID.value  =
        data.twitch.clientID ?? "";

    twitchClientSecret.value =
        data.twitch.clientSecret ?? "";

    twitchChannelName.value =
        data.twitch.channelName ?? "";

});