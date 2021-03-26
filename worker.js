const {
    parentPort
} = require('worker_threads');
const Display = require('./cpp/build/Release/display').Display;

const display = new Display(1234);
let number = 0000, showDate = false,  showK = false;

parentPort.once('message', (data) => {
    update(data);
    run();
    parentPort.on('message', (data) => {
        update(data);       
    });
});

function update(data) {
    number = data[0];
    showDate = data[1] || 0;
    showK = data[2] || 0;
}

function run() {
    const fn = () => {
        display.show(number, showDate, showK, 100);
        setImmediate(fn);
    }
    setImmediate(fn);
}