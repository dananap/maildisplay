var Imap = require('imap'),
    inspect = require('util').inspect;
const moment = require('moment');
const Display = require('./cpp/build/Release/display').Display;
const axios = require('axios').default;
const Bot = require('./tg-bot');

var imap = new Imap({
    user: 'daniel@dpulm.online',
    password: 'vpzuSRCH5Nyo',
    host: 'mail.dpulm.online',
    port: 143,
    tls: false,
    autotls: 'required'
});

const displayObj = new Display(1234);

const bot = new Bot();
let cmd = ['mails'];
bot.on('cmd', (cmd_) => cmd = cmd_.split(' '));

let stop = false;
let number = 0000;
let time = moment(), showDate = false;
let priceAge = moment().subtract(60, 'seconds');

async function display() {
    const fn = async () => {
        displayObj.show(number, showDate);
        if (!stop) {
            setImmediate(fn);
        }
    }
    setImmediate(fn);
}

function cleanup() {
    clearInterval(chkInterval);
}


function countUnread() {
    return new Promise((resolve, reject) => {
        openInbox(function (err, box) {
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
                        imap.end();
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

function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

function parseDate() {
    showDate = true;
    time.utcOffset(1);
    const min = time.minute();
    const hr = time.hour();
    number = parseInt('' + min % 10 + Math.floor((min / 10) % 10) + hr % 10 + Math.floor((hr / 10) % 10));
}

async function showMailCount() {
    imap.connect();
    imap.once('ready', async () => {
        const count = await countUnread();
        if (count === 0) {
            number = 0;
        } else {
            parseDate();
            sleep(5000).then(() => {
                showDate = false;
                number = count;
            });
        }
    });
}

const chkInterval = setInterval(async () => {
    switch (cmd[0]) {

        case 'price':
            if(moment().diff(priceAge, 'seconds') < 60) break;
            number = Math.floor(await getCryptoPrice(cmd[1] || undefined));
            priceAge = moment();
            break;
        case 'stock':
            if(moment().diff(priceAge, 'seconds') < 60) break;
            number = Math.floor(await getIntradayData(cmd[1]));
            priceAge = moment();
            break;
        default:
            await showMailCount();
            break;
    }
}, 15000);

async function main() {
    await display();
}

imap.once('error', function (err) {
    console.log(err);
    stop = true;
    process.nextTick(cleanup);
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

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    stop = true;
    process.nextTick(cleanup);
});

main();
