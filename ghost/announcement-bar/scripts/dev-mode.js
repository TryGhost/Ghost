const handler = require('serve-handler');
const http = require('http');
const chokidar = require('chokidar');
const chalk = require('chalk');
const {spawn} = require('child_process');
const minimist = require('minimist');

/* eslint-disable no-console */
const log = console.log;
/* eslint-enable no-console */

let buildProcess;
let fileChanges = [];
let spinner;
let stdOutChunks = [];
let stdErrChunks = [];

const {v, verbose, port = 5371, basic, b} = minimist(process.argv.slice(2));
const showVerbose = !!(v || verbose);
const showBasic = !!(b || basic);

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

function onBuildComplete(code) {
    buildProcess = null;
    printBuildComplete(code);
    stdErrChunks = [];
    stdOutChunks = [];
    if (fileChanges.length > 0) {
        buildPortal();
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
        ignored: /build|node_modules|.git|public|umd|scripts|(^|[/])\../
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
                {source: '/announcement-bar', destination: 'umd/announcement-bar.min.js'},
                {source: '/announcement-bar.min.js.map', destination: 'umd/announcement-bar.min.js.map'}
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
        watchFiles();
    });
}

startDevServer();
