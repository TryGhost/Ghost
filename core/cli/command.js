const logging = require('@tryghost/logging');

module.exports = class Command {
    constructor() {
        // eslint-disable-next-line no-constructor-return
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop === 'handle') {
                    this._beforeHandle();
                    return target[prop];
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    permittedEnvironments() {
        return ['development', 'local'];
    }

    _beforeHandle() {
        const env = process.env.NODE_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
        this.warn(`Node environment: ${env}`);
        if (!this.permittedEnvironments().includes(env)) {
            this.error(`Command ${this.constructor.name} is not permitted in ${env}`);
            process.exit();
        }
    }

    handle() {
        this.warn(`Command ${this.constructor.name} has not been implemented.`);
    }

    info() {
        logging.info(...arguments);
    }
    error() {
        logging.error(...arguments);
    }
    warn() {
        logging.warn(...arguments);
    }

    static run(command) {
        return (new command()).handle();
    }
};
