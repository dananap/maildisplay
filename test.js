const Display = require('./cpp/build/Release/display');
const display = new Display(1234);
let n = 1234;

let stop = false;
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    stop = true;
});

while(!stop) {
    display.show(n++);
}