var Imap = require('imap'),
    inspect = require('util').inspect;
const moment = require('moment');
const axios = require('axios').default;
const Bot = require('./tg-bot');
const {
    Worker, MessageChannel, MessagePort, isMainThread, parentPort
} = require('worker_threads');

var imap = new Imap({
    user: 'daniel@dpulm.online',
    password: 'vpzuSRCH5Nyo',
    host: 'mail.dpulm.online',
    port: 143,
    tls: false,
    autotls: 'required'
});
let imapConnected = false;

const worker = new Worker('./worker.js');

const bot = new Bot();
let cmd = ['mails'];
bot.on('cmd', (cmd_) => {
    cmd = cmd_.split(' ');
    priceAge = moment().subtract(60, 'seconds');
});

let number = 0000;
let time = moment(), showDate = false, showK = false;
let priceAge = moment().subtract(60, 'seconds');

function sendData() {
    worker.postMessage([number, showDate, showK]);
}

function cleanup() {
    imap.end();
    clearInterval(chkInterval);
    worker.terminate();
}


function countUnread() {
    return new Promise((resolve, reject) => {
        imap.openBox('INBOX', true, function (err, box) {
            if (err) throw err;
            let count = 0;
            imap.search(['UNSEEN'], function (err, results) {
                if (err) {
                    console.error(err);
                    return resolve(0);
                }
                try {
                    var f = imap.fetch(results, {
                        bodies: 'HEADER.FIELDS (DATE)',
                        struct: false
                    });
                    f.on('message', function (msg, seqno) {
                        count++;
                        console.log('Message #%d', seqno);
                        var prefix = '(#' + seqno + ') ';
                        msg.on('body', function (stream, info) {
                            var buffer = '';
                            stream.on('data', function (chunk) {
                                buffer += chunk.toString('utf8');
                            });
                            stream.once('end', function () {
                                console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
                            });
                        });
                        msg.once('attributes', function (attrs) {
                            console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                            time = moment(attrs.date)
                        });
                        msg.once('end', function () {
                            console.log(prefix + 'Finished');
                        });
                    });
                    f.once('error', function (err) {
                        console.log('Fetch error: ' + err);
                    });
                    f.once('end', function () {
                        console.log('Done fetching all messages!');
                        resolve(count);
                    });
                } catch (err) {
                    console.error(err);
                    return resolve(0);
                }
            });
        });
    });
}

function parseDate() {
    showDate = true;
    time.utcOffset(1);
    const min = time.minute();
    const hr = time.hour();
    number = parseInt('' + Math.floor((hr / 10) % 10) + hr % 10 + Math.floor((min / 10) % 10) + min % 10);
}

async function showMailCount() {
    if(!imapConnected) await reconnectImap();
    const count = await countUnread();
    if (count === 0) {
        number = 0;
    } else {
        parseDate();
        setTimeout((count_) => {
            showDate = false;
            number = count_;
            sendData();
        }, 5000, count);
    }
}

function reconnectImap() {
    return new Promise((resolve) => {
        imap.connect();
        imap.once('ready', async () => {
            imapConnected = true;
            resolve();
        });
    });
}

const chkInterval = setInterval(async () => {
    switch (cmd[0].toLowerCase()) {
        case 'price':
            if (moment().diff(priceAge, 'seconds') < 60) break;
            number = Math.floor(await getCryptoPrice(cmd[1] || undefined));
            showK = false;
            priceAge = moment();
            break;
        case 'stock':
            if (moment().diff(priceAge, 'seconds') < 60) break;
            number = Math.floor(await getIntradayData(cmd[1]));
            showK = false;
            priceAge = moment();
            break;
        case 'covid':
            if (moment().diff(priceAge, 'seconds') < 60) break;
            number = Math.floor(await getCovidData(cmd[1], cmd[2]));
            if (number >= 10000) {
                showK = true;
            } else {
                showK = false;
            }
            priceAge = moment();
            break;
        default:
            showK = false;
            await showMailCount();
            break;
    }
    sendData();
}, 25000);

async function main() {
    reconnectImap();
    sendData();
}

imap.once('error', function (err) {
    console.log(err);
});

imap.on('end', function () {
    console.log('Connection ended');
});

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function getCryptoPrice(id = 'ethereum') {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
            vs_currencies: 'eur',
            ids: id
        }
    });
    return data[id].eur;
}

async function getIntradayData(symbol) {
    const req = await axios.get('https://www.alphavantage.co/query', {
        params: {
            function: 'TIME_SERIES_INTRADAY',
            symbol,
            apikey: '3IFWTOJ46GQ5DIWR',
            // outputsize: "full",
            interval: '1min'
        }
    });

    const timeSeries = Object.values(req.data)[1];
    let timeArray = [];

    for (const [key, value] of Object.entries(timeSeries)) {
        const values = Object.values(value);
        let entry = {
            time: moment(key).utcOffset(-5).toDate(),
            open: parseFloat(values[0]),
            high: parseFloat(values[1]),
            low: parseFloat(values[2]),
            close: parseFloat(values[3]),
            volume: parseFloat(values[4]),
            symbol,
        }
        timeArray.push(entry);
    }

    return timeArray[0].close;
}

async function getCovidData(metric = '') {
    const req = await axios.get('https://www.alphavantage.co/query', {
        params: {
            function: 'TIME_SERIES_INTRADAY',
            symbol,
            apikey: '3IFWTOJ46GQ5DIWR',
            // outputsize: "full",
            interval: '1min'
        }
    });

    const timeSeries = Object.values(req.data)[1];
    let timeArray = [];

    for (const [key, value] of Object.entries(timeSeries)) {
        const values = Object.values(value);
        let entry = {
            time: moment(key).utcOffset(-5).toDate(),
            open: parseFloat(values[0]),
            high: parseFloat(values[1]),
            low: parseFloat(values[2]),
            close: parseFloat(values[3]),
            volume: parseFloat(values[4]),
            symbol,
        }
        timeArray.push(entry);
    }

    return timeArray[0].close;
}

async function getCovidData(metric = 'new_cases', country = 'DEU') {
    const req = await axios.get('https://github.com/owid/covid-19-data/raw/master/public/data/latest/owid-covid-latest.json');

    const metrics = req.data[country];

    return metrics[metric];
}

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    process.nextTick(cleanup);
});

main();
