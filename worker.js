const {
    parentPort
} = require('worker_threads');
const Display = require('./cpp/build/Release/display').Display;

const display = new Display(0000);
let number = 0000, showDate = false, showK = false, workerData, dataView;

parentPort.once('message', (data) => {
    workerData = data.workerData;
    dataView = new DataView(workerData);
    setInterval(update, 5000);
    update();
    const fn = () => {
        display.show(number, showDate, showK, 5000);
        setImmediate(fn);
    }
    fn();
});

function update() {
    number = dataView.getUint16(0);
    showDate = dataView.getUint8(2) != 0;
    showK = dataView.getUint8(3) != 0;
}

