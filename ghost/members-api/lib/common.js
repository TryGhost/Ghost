let currentLogger = {
    error: global.console.error,
    info: global.console.info,
    warn: global.console.warn
};

module.exports = {
    get logging() {
        const loggerInterface = Object.create(currentLogger);
        return Object.assign(loggerInterface, {
            setLogger(newLogger) {
                currentLogger = newLogger;
                // Overwrite any existing reference to loggerInterface
                Object.assign(loggerInterface, Object.create(newLogger));
            }
        });
    }
};
