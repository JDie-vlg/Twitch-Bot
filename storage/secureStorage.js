

//Node
const crypto = require('node:crypto');
const { generateKeyPair, sign, verify } = require('node:crypto')
const { promisify } = require('node:util')
const fs = require('node:fs');
const path = require('node:path');

//System
const os = require("os");
const { publicKey, privateKey } = promisify(generateKeyPair)('ed25519')

//Electron
const { safeStorage, app } = require('electron');

//Custom
const keytar = require('keytar');



class SimpleStore {
    constructor(options = {}) {
        this.name = options.name || 'config';
        this.filePath = path.join(
            app.getPath('userData'),
            `${this.name}.json`
        );
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf8');
                console.log(`Выгружен конфиг: ${content}`);
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('Ошибка загрузки хранилища:', error);
        }
        return {};
    }

    save(newData) {
        try {
            this.data = newData;

            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }

    get(key, defaultKey) {
        if (!key) return this.data;

        const keys = key.split('.');
        let value = this.data;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultKey;
            }
        }
        return value;
    }

    set(key, value) {
        if (!key) return;

        const keys = key.split('.');
        const lastKey = keys.pop();
        let current = this.data;

        for (const k of keys) {
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        current[lastKey] = value;
        this.save(this.data);
    }

    delete(key)  {
        if (!key) return;

        const keys = key.split('.');
        const lastKey = keys.pop();
        let current = this.data;

        for (const k of keys) {
            if (!current[k]) return;
            current = current[k];
        }

        delete current[lastKey];
        this.save(this.data);
    }

    clear() {
        this.data = {};
        this.save(this.data);
    }

}

class SimpleSecureStorage {
    constructor() {
        const os = require('os');
        const machineID = [
            os.hostname(),
            os.userInfo().username,
            app.getPath('userData')
        ].join('|');

        this.key = crypto.createHash('sha256').update(machineID).digest();

        this.store = new SimpleStore({ name: 'bot-config' });

    }

    async encrypt(data) {

        const algorithm = /** @type {any} */ ('aes-256-cbc');

        const keyHex = await keytar.getPassword(
            'BOTKey',
            'aes-key'
        );
        const keyCrypto = Buffer.from(keyHex, 'hex');

        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, keyCrypto, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    async decrypted(encryptedData) {

        const algorithm = /** @type {any} */ ('aes-256-cbc');

        const keyHex = await keytar.getPassword('BOTKey', 'aes-key');
        if (!keyHex) {
            throw new Error('Ключ не найдены в keytar');
        }

        const keyCrypto = Buffer.from(keyHex, 'hex');

        const [ivHex, encrypted] = encryptedData.split(':');
        console.log(`encrypted 1st: ${encrypted}`);
        if (!ivHex || !encrypted) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, keyCrypto, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');

        decrypted += decipher.final('utf8');

        return decrypted;
    }

    async saveData(data) {
         console.log('📝 Сохраняем данные:', JSON.stringify(data, null, 2));
        try {

            // const encryptedData = await this.encrypt(data);

            // Сохраняем в store
            this.store.set('bot-config', data);

            console.log('✅ Данные сохранены:', Object.keys(data));
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return false;
        }
    }

    async getData() {
        try {
            const data = this.store.get('bot-config');

            if (!data) {
                console.log('Отсутствуют данные для загрузки!')
                return null;
            }

            // const decryptedData = await this.decrypted(data);

            // Расшифровываем чувствительные данные
            // const decrypted = {};

            // for (const [key, value] of Object.entries(data)) {
                // if (this.isSensitive(key) && typeof value === 'string' && value.includes('encrypted:')) {
                //     decrypted[key] = this.decrypted(value);
                // } else {
                //     decrypted[key] = value;
                // }
            // }

            return data;
        } catch (error) {
            console.error('❌ Ошибка получения данных:', error);
            return null;
        }
    }

    clearData() {
        try {
            this.store.delete('bot-config');
            console.log('✅ Данные удалены');
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            return false;
        }
    }


    isSensitive(key) {
        const sensitiveKeys = ["clientID", "clientSecret", "twitchAccessToken", "donationalertsClientID", "donationalertsClientSecret", "donationalertsAccessToken", "telegramAPIToken"];
        return sensitiveKeys.some(k => key.toLowerCase().includes(k));
    }

}

module.exports.SimpleSecureStorage = SimpleSecureStorage;