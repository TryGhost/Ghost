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

    async ask(message, opts = {type: 'input'}) {
        const inquirer = require('inquirer');
        const response = await inquirer.prompt([{
            message,
            ...opts,
            name: 'value'
        }]);
        return response.value;
    }

    async confirm(message) {
        return this.ask(message, {type: 'confirm', default: false});
    }

    async secret(message) {
        return this.ask(message, {type: 'password'});
    }

    progressBar(total, opts = {}) {
        const chalk = require('chalk');
        const progress = require('cli-progress');
        const bar = new progress.Bar({
            format: `|${chalk[opts.color ?? 'cyan']('{bar}')}| {percentage}% | {value}/{total} {status}`,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: true,
            stopOnComplete: true,
            forceRedraw: true,
            ...opts
        });
        bar.start(total, 0, {status: ''});
        return bar;
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
        // @TODO: make sure we have an instance of `Command`
        return (new command()).handle();
    }
};
