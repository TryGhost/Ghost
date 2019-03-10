const chalk = require('chalk');
const log = (...args) => console.log(...args); // eslint-disable-line no-console

module.exports.log = log;
module.exports.log.error = (...args) => {
    log(chalk.red('error'), ...args);
};

module.exports.log.info = (...args) => {
    log(chalk.cyan('info'), ...args);
};

module.exports.log.ok = (...args) => {
    log(chalk.green('ok'), ...args);
};
