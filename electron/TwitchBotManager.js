const TwitchBot = require('../services/twitch');
const CommandHandler= require('../handlers/TwitchCommandHandler');
const TokenService = require('../services/TokenService');

class TwitchBotManager {
    constructor(storage) {
        this.storage = storage;
        this.commandHandler = new CommandHandler(storage);
        this.tokenService = new TokenService(storage);
        this.bot = null;

        this.setupCommands();
    }

    setupCommands() {

        const config = this.storage.store.data;
        const commands = config.twitchCommands || {};

        for (const [cmd, response] of Object.entries(commands)) {
            this.commandHandler.register(cmd, async ({ bot, channel }) => {
                bot.say(channel, response);
            });
        }
    }

    async handleTokenRefresh(config) {

        const newTokens = await this.tokenService.refresh(config);

        const update = {
            ...config,
            twitch: {
                ...config.twitch,
                ...newTokens
            }
        };

        this.storage.store.save(update);

        await this.bot.restart(update);
    }

    async start() {
        const config = this.storage.store.data;

        this.bot = new TwitchBot(config, this.commandHandler, this.storage);

        try {
            await this.bot.start();
        } catch (error) {
            console.error("[BOT START ERROR]", error)

            await this.handleTokenRefresh(config);
        }
    }

    async stop() {
        if (!this.bot) return;
        await this.bot.stop();
    }

    async restart(config) {
        // const config = this.storage.store.data;
        await this.bot.restart(config.twitch);
    }

    status() {
        return this.bot?.state || "STOPPED";
    }
}

module.exports.TwitchBotManager = TwitchBotManager;