const token = '1719132792:AAESxxs7G6aLfqKalmVkVE747ZFr_XR3Bos';
const axios = require('axios').default;
const api = axios.create({
    baseURL: 'https://api.telegram.org/bot' + token,
    method: 'GET'
});
const redis = require("redis");
const client = redis.createClient({
    // host: '192.168.5.1',
    // password: 'x26hpNEsELJS'
});
const {
    promisify
} = require("util");
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const lindex = promisify(client.lindex).bind(client);
const {
    EventEmitter
} = require('events');
const logger = require('./logger');

client.on("error", function (error) {
    logger.error('Redis error', {
        error
    });
});

class Bot extends EventEmitter {
    constructor(status, time = 5000) {
        super();
        this.time = time;
        this.timeout = setInterval(async () => {
            await this.getUpdates()
        }, time);
        this.status = status;

        this.status.on('mode', async (mode) => {
            const update = JSON.parse(await lindex('tg.updates', 0));
            const chat_id = update.message.from.id;
            const msg_id = update.message.message_id;
            const text = "*Mode:* " + mode.text + "\n*Number:* `" + mode.number + "`";
            if(mode.table) text += '\n\n' + mode.table;
            await this.sendMessage(chat_id, text, msg_id);
        });

    }

    async replyRecent(text) {
        const update = JSON.parse(await lindex('tg.updates', 0));
        const chat_id = update.message.from.id;
        const msg_id = update.message.message_id;
        await this.sendMessage(chat_id, text, msg_id);
    }

    async getUpdates() {
        let offset = (await getAsync('tg.offset')) || 0;

        const res = await api('/getUpdates', {
            params: {
                offset
            }
        });
        const {
            data
        } = res;

        for (let u of data.result) {
            offset = Math.max(offset, u.update_id + 1);
            client.lpush('tg.updates', JSON.stringify(u));
            if (u.message) {
                const {
                    text,
                    from
                } = u.message;
                logger.verbose("telegram update", u);
                logger.info("telegram message", {
                    text,
                    from: from.username
                })
                this.emit('cmd', text);
            }
        }
        await setAsync('tg.offset', offset);
        // this.timeout = setTimeout(this.getUpdates, this.time);
    }

    async sendMessage(chat_id, text, reply_to_message_id) {
        let res;
        try {
            res = await api.post('/sendMessage', {
                chat_id,
                text,
                reply_to_message_id,
                parse_mode: "MarkdownV2"
            });
            logger.info("sent telegram message", {
                chat_id,
                text
            });
            return res;

        } catch (e) {
            logger.error('telegram message error', {
                chat_id,
                text,
                e,
                res
            });
            console.dir(res);
        }

    }
}

module.exports = Bot;