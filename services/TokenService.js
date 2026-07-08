

class TokenService {
    constructor(storage) {
        this.storage = storage;
    }

    async refresh(config) {
        console.log(`refresh_token : ${config.twitch.refreshToken}`);
        console.log(`client_id : ${config.twitch.clientID}`);
        console.log(`client_secret : ${config.twitch.clientSecret}`);
        const res = await fetch('https://id.twitch.tv/oauth2/token', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: config.twitch.clientID,
                client_secret: config.twitch.clientSecret,
                grant_type: "refresh_token",
                refresh_token: config.twitch.refreshToken
            })
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));

        if (!data.access_token) {
            throw new Error("No access_token");
        }

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token  || config.refreshToken
        };
    }
}

module.exports = TokenService;