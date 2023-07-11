const handler = require('serve-handler');
const http = require('http');
const chalk = require('chalk');
const {spawn} = require('child_process');
const minimist = require('minimist');

/* eslint-disable no-console */
const log = console.log;
/* eslint-enable no-console */

let yarnStartProcess;
let stdOutChunks = [];
let stdErrChunks = [];
let startYarnOutput = false;

const {v, verbose, port = 5370} = minimist(process.argv.slice(2));
const showVerbose = !!(v || verbose);

function clearConsole({withHistory = true} = {}) {
    if (!withHistory) {
        process.stdout.write('\x1Bc');
        return;
    }
    process.stdout.write(
        process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
    );
}

function printConfigInstruction() {
    const data = {
        announcementBar: {
            url: `http://localhost:${port}/announcement-bar`
        }
    };
    const stringifedData = JSON.stringify(data, null, 2);
    const splitData = stringifedData.split('\n');
    log();
    splitData.forEach((data, idx, arr) => {
        if (idx === 0 || idx === arr.length - 1) {
            log(chalk.grey(data));
        } else {
            log(chalk.bold.whiteBright(data));
        }
    });
    log();
}

function printInstructions() {
    log();
    log(chalk.yellowBright.underline(`Add announcementBar to your local Ghost config`));
    printConfigInstruction();
    log(chalk.cyanBright('='.repeat(50)));
    log();
}

function onProcessClose(code) {
    yarnStartProcess = null;
    stdErrChunks = [];
    stdOutChunks = [];
    log(chalk.redBright.bold.underline(`Please restart the script...\n`));
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

function doYarnStart() {
    if (yarnStartProcess) {
        return;
    }
    const options = getBuildOptions();
    yarnStartProcess = spawn('yarn start:combined', options);

    ['SIGINT', 'SIGTERM'].forEach(function (sig) {
        yarnStartProcess.on(sig, function () {
            yarnStartProcess && yarnStartProcess.exit();
        });
    });

    yarnStartProcess.on('close', onProcessClose);

    if (!showVerbose) {
        yarnStartProcess.stdout.on('data', (data) => {
            stdOutChunks.push(data);
            printYarnProcessOutput(data);
        });
        yarnStartProcess.stderr.on('data', (data) => {
            log(Buffer.from(data).toString());
            stdErrChunks.push(data);
        });
    }
}

function printYarnProcessOutput(data) {
    const dataStr = Buffer.from(data).toString();
    const dataArr = dataStr.split('\n').filter((d) => {
        return /\S/.test(d.trim());
    });
    if (dataArr.find(d => d.includes('Starting the development'))) {
        startYarnOutput = true;
        log(chalk.yellowBright('Starting the development server...\n'));
        return;
    }
    dataArr.forEach((dataOut) => {
        if (startYarnOutput) {
            log(dataOut);
        }
    });
    if (startYarnOutput) {
        log();
    }
}

function startDevServer() {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            rewrites: [
                {source: '/announcement-bar', destination: 'scripts/load-portal.js'}
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
        doYarnStart();
    });
}

clearConsole({withHistory: false});
startDevServer();
