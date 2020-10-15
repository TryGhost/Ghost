const chalk = require('chalk');
const log = (...args) => console.log(...args); // eslint-disable-line no-console

module.exports.log = log;

module.exports.log.ok = (...args) => {
    log(chalk.green('ok'), ...args);
};

module.exports.log.trace = (...args) => {
    log(chalk.gray('trace'), ...args);
};

module.exports.log.debug = (...args) => {
    log(chalk.gray('debug'), ...args);
};

module.exports.log.info = (...args) => {
    log(chalk.cyan('info'), ...args);
};

module.exports.log.warn = (...args) => {
    log(chalk.magenta('warn'), ...args);
};

module.exports.log.error = (...args) => {
    log(chalk.red('error'), ...args);
};

module.exports.log.fatal = (...args) => {
    log(chalk.inverse('fatal'), ...args);
};
