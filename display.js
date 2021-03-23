const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var Imap = require('imap'),
    inspect = require('util').inspect;
const moment = require('moment');

var imap = new Imap({
    user: 'daniel@dpulm.online',
    password: 'vpzuSRCH5Nyo',
    host: 'mail.dpulm.online',
    port: 143,
    tls: false,
    autotls: 'required'
});


const Digits = [22, 27, 17, 24];
const Segments = [11, 4, 23, 8, 7, 10, 18];
const point = new Gpio(25, 'out');
let digits = [], segments = [];
let stop = false;
let number = [0, 0, 0, 0];
let time = moment(), showDate = false;

for (let i of Digits) {
    digits.push(new Gpio(i, 'out'));
}

for (let i of Segments) {
    segments.push(new Gpio(i, 'out'));
}

const num = [
    [1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 1, 1],
    [1, 0, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 1]
];

async function display() {
    const fn = async () => {
        const n = number;

        for (let i = 0; i < 4; i++) {
            let proms = [];
            // proms.push(digits[i].write(0));
            for (let j = 0; j < 7; j++) {
                proms.push(segments[j].write(num[n[i]][j]));
            }
            proms.push(point.write(showDate ? 1 : 0));
            await Promise.all(proms);
            await digits[i].write(0);
            await sleep(1);
            await digits[i].write(1);
        }
        if (!stop) {
            process.nextTick(fn);
        }
    }
    setImmediate(fn);
}

function cleanup() {
    clearInterval(chkInterval);
    digits.forEach((led) => led.unexport());
    segments.forEach((led) => led.writeSync(0));
    segments.forEach((led) => led.unexport());
    process.exit();
}


function countUnread() {
    return new Promise((resolve, reject) => {
        openInbox(function (err, box) {
            if (err) throw err;
            let count = 0;
            imap.search(['UNSEEN'], function (err, results) {
                if (err) throw err;
                var f = imap.fetch(results, {
                    bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                    struct: true
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
            });
        });
    });
}

function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

async function showCount() {
    imap.connect();
    imap.once('ready', async () => {
        const count = await countUnread();
        if (count > 0) {
            parseDate();
            sleep(10000).then(() => {
                showDate = false;
                parseCount();
            });
        } else {
            parseCount();
        }

        function parseCount() {
            number[3] = count % 10;
            number[2] = Math.floor((count / 10) % 10);
            number[1] = Math.floor((count / 100) % 10);
            number[0] = Math.floor((count / 1000) % 10);
        }

        function parseDate() {
            showDate = true;
            const min = time.minute();
            const hr = time.hour();
            number[3] = min % 10;
            number[2] = Math.floor((min / 10) % 10);
            number[1] = hr % 10;
            number[0] = Math.floor((hr / 10) % 10);
        }
    });
}

const chkInterval = setInterval(async () => {
    await showCount();
}, 30000);

async function main() {
    digits.forEach((led) => led.writeSync(1));
    segments.forEach((led) => led.writeSync(0));

    await showCount();
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

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    stop = true;
    process.nextTick(cleanup);
});

main();
