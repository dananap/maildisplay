const {
    Worker, MessageChannel, MessagePort, isMainThread, parentPort
} = require('worker_threads');
const Display = require('./cpp/build/Release/display').Display;

const display = new Display(1234);
let number = 0000, showDate = false,  showK = false;
let stop = false;

parentPort.once('message', (data) => {
    update(data);
    run();
    parentPort.on('message', (data) => {
        update(data);       
    });
});

function update(data) {
    if(data === null) {
        stop = true;
        return;
    }
    number = data[0];
    showDate = data[1] || 0;
    showK = data[2] || 0;
}

async function run() {
    const fn = async () => {
        display.show(number, showDate, showK);
        if (!stop) {
            setImmediate(fn);
        }
    }
    setImmediate(fn);
}