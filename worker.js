const {
    parentPort
} = require('worker_threads');
const Display = require('./cpp/build/Release/display').Display;

const display = new Display(1234);
let number = 0000, showDate = false, showK = false, workerData, dataView;

parentPort.once('message', (data) => {
    workerData = data.workerData;
    dataView = new DataView(workerData);
    update();
    fn();
    const fn = () => {
        display.show(number, showDate, showK, 1000);
        update();
        setImmediate(fn);
    }
});

function update() {
    number = dataView.getUint16(0);
    showDate = dataView.getUint8(2) != 0;
    showK = dataView.getUint8(3) != 0;
}

