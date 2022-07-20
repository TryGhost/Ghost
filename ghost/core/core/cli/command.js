const cli = require('@tryghost/pretty-cli');
const logging = cli.ui.log;
const chalk = require('chalk');

const errors = {
    ERR_INVALID_COMMAND: 1,
    ERR_INVALID_ENV: 2
};

module.exports = class Command {
    constructor() {
        this.checkEnv();
        this.init();
        this.setup();
    }

    /**
     * @private
     */
    init() {
        this.cli = cli;
        this.cli.strict();
        // this is always present but not used
        this.cli.positional('<command>', {hidden: true});
    }

    setup() {
        // init cli options
    }

    permittedEnvironments() {
        return ['development', 'local'];
    }

    /**
     * @private
     */
    checkEnv() {
        const env = process.env.NODE_ENV ?? 'development';
        this.warn(`Node environment: ${chalk.bold(env)}`);
        if (!this.permittedEnvironments().includes(env)) {
            this.fatal(`Command ${this.constructor.name} is not permitted in ${env}`);
            process.exit(errors.ERR_INVALID_ENV);
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

    argument(key, opts = {}) {
        this.cli[opts.type ?? 'positional'](key, opts);
    }

    help(message) {
        this.cli.preface(`\n${message}`);
    }

    /* output aliases */
    log() {
        logging(...arguments);
    }
    ok() {
        logging.ok(...arguments);
    }
    info() {
        logging.info(...arguments);
    }
    error() {
        logging.error(...arguments);
    }
    fatal() {
        logging.fatal(...arguments);
    }
    warn() {
        logging.warn(...arguments);
    }
    debug() {
        logging.debug(...arguments);
    }

    static async run(command) {
        // attempt to load a cli command by name
        if (typeof command === 'string') {
            command = require(`./${command}`);
        }
        const cmd = new command();
        if (cmd instanceof Command !== true) {
            logging.fatal('Invalid command.');
            process.exit(errors.ERR_INVALID_COMMAND);
        }
        const argv = await cmd.cli.parseAndExit();
        return await cmd.handle(argv);
    }
};
