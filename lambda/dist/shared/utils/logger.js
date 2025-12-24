"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
// lambda/shared/utils/logger.ts
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(JSON.stringify({
            level: 'INFO',
            context: this.context,
            message,
            data,
            timestamp: new Date().toISOString(),
        }));
    }
    error(message, error) {
        console.error(JSON.stringify({
            level: 'ERROR',
            context: this.context,
            message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
        }));
    }
    debug(message, data) {
        if (process.env.ENVIRONMENT === 'dev') {
            console.debug(JSON.stringify({
                level: 'DEBUG',
                context: this.context,
                message,
                data,
                timestamp: new Date().toISOString(),
            }));
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map