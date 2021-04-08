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
const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const {EventEmitter} = require('events');

client.on("error", function (error) {
    console.error(error);
});

class Bot extends EventEmitter {
    constructor(time = 5000) {
        super();
        this.time = time;
        this.timeout = setInterval(async () => {await this.getUpdates()}, time);
    }

    async getUpdates() {
        let offset = (await getAsync('tg.offset')) || 0;
    
        const res = await api('/getUpdates', {
            params: {
                offset
            }
        });
        const { data } = res;
    
        for(let u of data.result) {
            offset = Math.max(offset, u.update_id+1);
            client.lpush('tg.updates', JSON.stringify(u));
            if(u.message) {
                const {text, from} = u.message;
                console.log({text, from});
                this.emit('cmd', text);
            }
        }
        await setAsync('tg.offset', offset);
        // this.timeout = setTimeout(this.getUpdates, this.time);
    }

}

module.exports = Bot;
