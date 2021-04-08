const {
    createLogger,
    format,
    transports,
} = require('winston');

const {
    combine,
    timestamp,
    printf,
    splat,
    simple,
    json,
    colorize,
} = format;

const ENV = process.env.NODE_ENV;

const LEVEL = Symbol.for('level');

function filterOnly(level) {
    return format((info) => {
        if (info[LEVEL] === level) {
            return info;
        }
    })();
}

const enumerateErrorFormat = format((info) => {
    // if (info.message instanceof Error) {
    //     info.message = {
    //         message: info.message.message,
    //         stack: info.message.stack,
    //         ...info.message,
    //     };
    // }

    if (info instanceof Error) {
        return {
            message: info.message,
            stack: info.stack,
            ...info,
        };
    }

    return info;
});

const jsonLogger = createLogger({
    format: combine(
        splat(),
        timestamp(),
        enumerateErrorFormat(),
        json(),
        // prettyPrintDebug()
    ),
    transports: [
        new transports.File({
            level: 'error',
            filename: 'logs/error.log',
        }),
        new transports.File({
            filename: 'logs/info.log',
        }),
        new transports.File({
            level: 'verbose',
            filename: 'logs/verbose.log',
            format: filterOnly('verbose'),
        }),
    ],
    exceptionHandlers: [
        new transports.File({
            filename: 'logs/exceptions.log',
        }),
    ],
});

const prettyLogger = createLogger({
    format: combine(
        colorize(),
        splat(),
        timestamp(),
        // winstonTimestampColorize(),
        simple(),
        // myFormat,
        // prettyPrint()
    ),
    transports: [new transports.Console()],
});

if (ENV !== 'production') jsonLogger.add(prettyLogger);

// const logger = winston.createLogger({
//     transports: [
//         new winston.transports.Console(),
//         new winston.transports.File({ filename: 'combined.log' })
//     ]
// });

module.exports = jsonLogger;
