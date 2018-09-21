const chalk = require('chalk');

module.exports = {
    // Usage: script [options] etc
    usagePrefix: (str) => {
        return chalk.yellow(str.slice(0, 6)) + '\n  ' + str.slice(7);
    },
    // Options: Arguments: etc
    group: str => chalk.yellow(str),
    // --help etc
    flags: str => chalk.green(str),
    // [required] [boolean] etc
    hints: str => chalk.dim(str),
    // Use different style when a type is invalid
    groupError: str => chalk.red(str),
    flagsError: str => chalk.red(str),
    descError: str => chalk.yellow(str),
    hintsError: str => chalk.red(str),
    // style error messages
    messages: str => chalk.red(str)
};
