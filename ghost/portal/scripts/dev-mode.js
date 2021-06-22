const handler = require('serve-handler');
const http = require('http');
const chokidar = require('chokidar');
const chalk = require('chalk');
const {spawn} = require('child_process');
const minimist = require('minimist');
const ora = require('ora');

/* eslint-disable no-console */
const log = console.log;
/* eslint-enable no-console */

let buildProcess;
let fileChanges = [];
let spinner;
let stdOutChunks = [];
let stdErrChunks = [];

const {v, verbose, port = 5000, basic, b} = minimist(process.argv.slice(2));
const showVerbose = !!(v || verbose);
const showBasic = !!(b || basic);

function clearConsole({withHistory = true} = {}) {
    if (!withHistory) {
        process.stdout.write('\x1Bc');
        return;
    }
    process.stdout.write(
        process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
    );
}

function maybePluralize(count, noun, suffix = 's') {
    return `${count} ${noun}${count !== 1 ? suffix : ''}`;
}

function printFileChanges() {
    if (fileChanges.length > 0) {
        const prefix = maybePluralize(fileChanges.length, 'file');
        log(chalk.bold.hex('#ffa300').underline(`${prefix} changed`));
        const message = fileChanges.map((path) => {
            return chalk.hex('#ffa300').dim(`${path}`);
        }).join('\n');
        log(message);
        log();
    }
}

function printBuildSuccessDetails() {
    if (showBasic) {
        return;
    }
    if ((stdOutChunks && stdOutChunks.length > 0)) {
        const detail = Buffer.concat(stdOutChunks.slice(4,7)).toString();
        log();
        log(chalk.dim(detail));
    }
}

function printBuildErrorDetails() {
    if ((stdOutChunks && stdOutChunks.length > 0)) {
        const failDetails = Buffer.concat(stdOutChunks.slice(4, stdOutChunks.length - 1)).toString().replace(/^(?=\n)$|\s*$|\n\n+/gm, '');
        log(chalk(failDetails));
    }
    if (stdErrChunks && stdErrChunks.length > 0) {
        const stderrContent = Buffer.concat(stdErrChunks).toString();
        log(chalk.dim(stderrContent));
    }
}

function printBuildComplete(code) {
    if (code === 0) {
        if (!showVerbose) {
            spinner && spinner.succeed(chalk.greenBright.bold('Build finished'));
            printBuildSuccessDetails();
        } else {
            log();
            log(chalk.bold.greenBright.bgBlackBright(`${'-'.repeat(25)}Build Success${'-'.repeat(25)}`));
        }
    } else {
        if (!showVerbose) {
            spinner && spinner.fail(chalk.redBright.bold('Build failed'));
            printBuildErrorDetails();
        } else {
            log(chalk.bold.redBright.bgBlackBright(`${'-'.repeat(25)}Build finished: Failed${'-'.repeat(25)}`));
        }
    }
    log();
}

function printConfigInstruction() {
    const data = {
        portal: {
            url: `http://localhost:${port}/portal`
        }
    };
    const stringifedData = JSON.stringify(data, null, 2);
    const splitData = stringifedData.split('\n');
    log();
    splitData.forEach((_data, idx, arr) => {
        if (idx === 0 || idx === arr.length - 1) {
            log(chalk.grey(_data));
        } else {
            log(chalk.bold.whiteBright(_data));
        }
    });
    log();
}

function printInstructions() {
    log();
    log(chalk.yellowBright.underline(`Add portal to your local Ghost config`));
    printConfigInstruction();
    log(chalk.cyanBright('='.repeat(50)));
    log();
}

function printBuildStart() {
    if (showVerbose) {
        log(chalk.bold.greenBright.bgBlackBright(`${'-'.repeat(32)}Building${'-'.repeat(32)}`));
        log();
    } else {
        spinner = ora(chalk.magentaBright.bold('Bundling files, hang on...')).start();
    }
}

function onBuildComplete(code) {
    buildProcess = null;
    printBuildComplete(code);
    stdErrChunks = [];
    stdOutChunks = [];
    if (fileChanges.length > 0) {
        buildPortal();
    } else {
        log(chalk.yellowBright.bold.underline(`Watching file changes...\n`));
    }
}

function getBuildOptions() {
    process.env.FORCE_COLOR = 'true';
    const options = {
        shell: true,
        env: process.env
    };
    if (showVerbose) {
        options.stdio = 'inherit';
    }
    return options;
}

function buildPortal() {
    if (buildProcess) {
        return;
    }
    printFileChanges();
    printBuildStart();
    fileChanges = [];
    const options = getBuildOptions();
    buildProcess = spawn('yarn build', options);

    buildProcess.on('close', onBuildComplete);

    if (!showVerbose) {
        buildProcess.stdout.on('data', (data) => {
            stdOutChunks.push(data);
        });
        buildProcess.stderr.on('data', (data) => {
            stdErrChunks.push(data);
        });
    }
}

function watchFiles() {
    const watcher = chokidar.watch('.', {
        ignored: /build|node_modules|.git|public|umd|scripts|(^|[\/\\])\../
    });

    watcher.on('ready', () => {
        buildPortal();
    }).on('change', (path) => {
        if (!fileChanges.includes(path)) {
            fileChanges.push(path);
        }
        if (!buildProcess) {
            buildPortal();
        }
    });
}

function startDevServer() {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            rewrites: [
                {source: '/portal', destination: 'umd/portal.min.js'},
                {source: '/portal.min.js.map', destination: 'umd/portal.min.js.map'}
            ],
            headers: [
                {
                    source: '**',
                    headers: [{
                        key: 'Cache-Control',
                        value: 'no-cache'
                    },{
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
                    }]
                }
            ]
        });
    });

    server.listen(port, () => {
        log(chalk.whiteBright(`Portal dev server is running on http://localhost:${port}`));
        printInstructions();
        watchFiles();
    });
}

clearConsole({withHistory: false});
startDevServer();
