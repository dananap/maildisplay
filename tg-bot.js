const token = '1719132792:AAESxxs7G6aLfqKalmVkVE747ZFr_XR3Bos';
const axios = require('axios').default;
const api = axios.create({
    baseURL: 'https://api.telegram.org/bot' + token,
    method: 'GET'
});
const redis = require("redis");
const client = redis.createClient();
const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

client.on("error", function (error) {
    console.error(error);
});

async function getUpdates() {
    const res = await api('/getUpdates', {
        params: {
            offset: (await getAsync('tg.offset')) || 0
        }
    });
    const { data } = res;

    for(let u of data) {
        client.lpush('tg.updates', JSON.stringify(u));
        if(u.message) {
            const {text, from} = u.message;
            console.log({text, from});
        }
    }

}

async function main() {
    let run = 1;
    while(run) {
        await getUpdates();
        await sleep(1000);
    }
}
main();


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}