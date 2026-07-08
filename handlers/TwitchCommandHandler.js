

class TwitchCommandHandler {
    constructor(storage) {
        this.storage = storage;
        this.commands = new Map();
        this.cooldowns = new Map();
    }

    register(command, config) {
        this.commands.set(command, {
            handler: config.handler,
            cooldown: config.cooldown || 0,
            role: config.role || "user"
        });
    }

    async handle(ctx) {
        const { message, bot, channel, userstate } = ctx;

        if (!message.startsWith("!")) return;

        const [cmd, ...args] = message.slice(1).split(" ");

        const command = this.commands.get(cmd);

        // fallback dynamic commands from config
        const configCommands = this.storage.store.get("twitch.commands") || {};

        const dynamic = configCommands[cmd];

        if (!command && !dynamic) return;

        const now = Date.now();

        // cooldown check
        const lastUsed = this.cooldowns.get(cmd) || 0;
        const cooldown = command?.cooldown || 0;

        if (now - lastUsed < cooldown * 1000) return;

        // role check
        const userRole = this.getRole(userstate);

        const requiredRole = command?.role || "user";

        if (!this.checkRole(userRole, requiredRole)) {
            return;
        }

        this.cooldowns.set(cmd, now);

        try {
            if (command) {
                await command.handler({ bot, channel, userstate, args });
            } else {
                // dynamic command from UI
                await bot.say(channel, this.replaceArgs(dynamic, args));
            }
        } catch (err) {
            console.error("[CMD ERROR]", err);
        }
    }

    getRole(userstate) {
        if (userstate.badges?.broadcaster) return "admin";
        if (userstate.mod) return "mod";
        return "user";
    }

    checkRole(user, required) {
        const hierarchy = {
            user: 0,
            mod: 1,
            admin: 2
        };

        return hierarchy[user] >= hierarchy[required];
    }

    parseArgs(args) {
        return {
            raw: args,
            user: args[0],
            text: args.slice(1).join(" ")
        };
    }

    replaceArgs(template, args) {
        return template
            .replace("{user}", args[0] || "")
            .replace("{args}", args.join(" "));
    }

    reloadDynamicCommands() {
        const commands = this.storage.store.get("twitch.commands") || {};

        for (const [cmd, text] of Object.entries(commands)) {
            this.commands.set(cmd, {
                handler: async ({ bot, channel, args }) => {
                    const msg = text
                        .replace("{user}", args[0] || "")
                        .replace("{args}", args.join(" "));

                    await bot.say(channel, msg);
                },
                cooldown: 0,
                role: "user"
            });
        }
    }

}

module.exports = TwitchCommandHandler;