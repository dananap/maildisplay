var Imap = require('imap'),
    inspect = require('util').inspect;
const moment = require('moment');
const Display = require('./cpp/build/Release/display').Display;

var imap = new Imap({
    user: 'daniel@dpulm.online',
    password: 'vpzuSRCH5Nyo',
    host: 'mail.dpulm.online',
    port: 143,
    tls: false,
    autotls: 'required'
});

const displayObj = new Display(1234);
const Digits = [22, 27, 17, 24];
const Segments = [11, 4, 23, 8, 7, 10, 18];
let digits = [], segments = [];
let stop = false;
let number = [0, 0, 0, 0];
let time = moment(), showDate = false;


async function display() {
    const fn = async () => {
        displayObj.show(parseInt(number.join('')), showDate);
        if (!stop) {
            process.nextTick(fn);
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

function parseCount(count) {
    number[3] = count % 10;
    number[2] = Math.floor((count / 10) % 10);
    number[1] = Math.floor((count / 100) % 10);
    number[0] = Math.floor((count / 1000) % 10);
}

function parseDate() {
    showDate = true;
    time.utcOffset(1);
    const min = time.minute();
    const hr = time.hour();
    number[3] = min % 10;
    number[2] = Math.floor((min / 10) % 10);
    number[1] = hr % 10;
    number[0] = Math.floor((hr / 10) % 10);
}

async function showCount() {
    imap.connect();
    imap.once('ready', async () => {
        const count = await countUnread();
        if (count === 0) {
            number = [0, 0, 0, 0];
        } else {
            parseDate();
            sleep(5000).then(() => {
                showDate = false;
                parseCount(count);
            });
        }
    });
}

const chkInterval = setInterval(async () => {
    await showCount();
}, 15000);

async function main() {
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
