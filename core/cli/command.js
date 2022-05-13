const logging = require('@tryghost/logging');
const prompt = require('prompt-sync')({sigint: true});

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
        const env = process.env.NODE_ENV ?? 'development';
        this.warn(`Node environment: ${env}`);
        if (!this.permittedEnvironments().includes(env)) {
            this.error(`Command ${this.constructor.name} is not permitted in ${env}`);
            process.exit(1);
        }
    }

    handle() {
        this.warn(`Command ${this.constructor.name} has not been implemented.`);
    }

    ask(message, value) {
        return prompt(message, value);
    }

    confirm(message) {
        const response = this.ask(`${message} (y/N): `, false);
        if (['y','yes','Y'].includes(response)) {
            return true;
        }
        return false;
    }

    secret(message) {
        return prompt.hide(message);
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
