const tmi = require('tmi.js');
const { TwitchAuthorizeAPI }  = require('twitchdatelegram_api');
const http = require('http');
require('dotenv').config();
const { BrowserWindow } = require('electron');
const { SimpleSecureStorage } = require('../storage/secureStorage')

class TwitchBot {
    constructor(config, commandHandler, storage) {
        this.config = config;
        console.log(JSON.stringify(config, null, 2));
        this.storage = storage;
        this.commandHandler = commandHandler;
        this.client = null;
        this.state = "STARTING" | "RUNNING" | "STOPPED" | "STOPPING";
        this.lifecycleLock = false;
        this.secure = new SimpleSecureStorage();
    }


    async authorizeTwitch() {
        try {
            const PORT = 3000;

            const authCode = await new Promise((resolve, reject) => {
                const server = http.createServer((req, res) => {
                    const url = new URL(req.url, process.env.TWITCH_REDIRECT_URI);
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`
                            <html>
                                <body style="text-align: center; padding-top: 50px;">
                                    <h1>✅ Авторизация успешна!</h1>
                                    <p>Можете закрыть это окно</p>
                                    <script>window.close();</script>
                                </body>
                            </html>
                        `);
                        server.close();
                        resolve(code);
                    } else if (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>❌ Ошибка авторизации</h1>');
                        server.close();
                    } else {
                        res.writeHead(404);
                        res.end();
                    }
                });

                server.listen(PORT, async () => {
                   console.log(`Сервер запущен ${process.env.TWITCH_REDIRECT_URI}`);

                   try  {
                       const twitchAuthAPI = new TwitchAuthorizeAPI(
                            this.config.twitch.clientID,
                            this.config.twitch.clientSecret,
                            process.env.TWITCH_REDIRECT_URI,
                            process.env.TWITCH_SCOPES
                        );

                       const authUrl = await twitchAuthAPI.login();

                       const authWindow = new BrowserWindow({
                           width: 1000,
                           height: 800,
                           title: 'Авторизация Twitch'
                       });

                       await authWindow.loadURL(authUrl);

                   } catch (error) {
                       server.close();
                       reject(error);
                   }
                });
            });

            console.log('Код авторизации получен: ', authCode);

            const twitchAuthAPI = new TwitchAuthorizeAPI(
                this.config.twitch.clientID,
                this.config.twitch.clientSecret,
                process.env.TWITCH_REDIRECT_URI,
                process.env.TWITCH_SCOPES
            );

            const result = await twitchAuthAPI.get_access_token(authCode);

            return { accessToken: result.access_token, refreshToken: result.refresh_token }
        } catch (error) {
            console.error('Ошибка авторизации:', error);
        }
    }


    async start() {
        console.log("ENTER start");
        this.storage.getData();

        if (this.lifecycleLock) {
            console.log("blocked by lifecycle lock");
            return;
        }

        this.lifecycleLock = true;

        try {
            if (this.state === "RUNNING" || this.state === "STARTING") {
                console.log("Start ignored - already running");
                return;
            }

            this.state = "STARTING";

            if (!this.config.twitch.accessToken) {
                const result = await this.authorizeTwitch();

                // const encryptedAccessToken = await this.secure.encrypt(result.accessToken);
                // const encryptedRefreshToken = await this.secure.encrypt(result.refreshToken);

                const updated = {
                    ...this.config,
                    twitch: {
                        ...this.config.twitch,
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken
                    }
                };

                this.config = updated;
                this.storage.store.save(updated);
            }

            const decryptedAccessToken = await this.secure.decrypted(this.config.twitch.accessToken);

            this.client = tmi.Client({
                options: {
                    debug: true
                },
                connection: {
                    reconnect: true,
                    secure: true
                },
                identity: {
                    username: this.config.twitch.channelName,
                    password: `oauth:${decryptedAccessToken}`
                },
                channels: [this.config.twitch.channelName]
            });

            this.client.on("message", (channel, userstate, message, self) => {
                if (self) return;

                this.commandHandler.handle({
                    bot: this.client,
                    channel,
                    userstate,
                    message
                });
            });

            await this.client.connect();
            this.state = "RUNNING";

            console.log("[BOT] connected");
        } finally {
            this.lifecycleLock  = false;
        }
    }

    async stop() {
        console.log("ENTER stop");
        if (this.state === "STOPPING") return;
        if (!this.client) return;

        this.state = "STOPPING";

        try {
            await this.client.disconnect()
        } catch (error) {
            console.log("disconnect error ignored");
        }

        this.client = null;
        this.state = "STOPPED";

        console.log("[BOT] stopped");
    }

    async restart(config) {
        console.log("ENTER restart");

        if (!config?.twitch) {
            console.error("Invalid restart config:", config);
            return;
        }

        this.config = config;

        await this.stop();
        await this.start();
    }
}

module.exports = TwitchBot;