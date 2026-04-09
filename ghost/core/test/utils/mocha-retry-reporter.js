const _ = require('lodash');
const mocha = require('mocha');

// Escape data/properties for GitHub Actions workflow commands.
// See https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
function escapeData(s) {
    return String(s ?? '')
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return String(s ?? '')
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
function issueWarning(message, properties) {
    const {file, startLine, startColumn} = properties || {};
    const props = [];
    if (file) {
        props.push(`file=${escapeProperty(file)}`);
    }
    if (startLine !== undefined) {
        props.push(`line=${escapeProperty(startLine)}`);
    }
    if (startColumn !== undefined) {
        props.push(`col=${escapeProperty(startColumn)}`);
    }
    const propsStr = props.length ? ` ${props.join(',')}` : '';
    // eslint-disable-next-line no-console
    console.log(`::warning${propsStr}::${escapeData(message)}`);
}

// From https://github.com/findmypast-oss/mocha-json-streamier-reporter/blob/master/lib/parse-stack-trace.js
function extractModuleLineAndColumn(stackTrace) {
    const matches = /^\s*at Context.* \(([^\(\)]+):([0-9]+):([0-9]+)\)/gm.exec(stackTrace);

    if (matches === null) {
        return {};
    }

    return {
        file: matches[1],
        line: parseInt(matches[2]),
        col: parseInt(matches[3])
    };
}

module.exports = class RetryReporter extends mocha.reporters.Spec {
    constructor(runner) {
        super(runner);

        if (!process.env.CI || !process.env.GITHUB_ACTIONS) {
            return;
        }

        if (runner.suite.retries() === 0) {
            return;
        }

        const retriedTests = [];
        const failedTests = [];

        runner
            .on(mocha.Runner.constants.EVENT_TEST_RETRY, (test, err) => {
                // eslint-disable-next-line no-console
                console.log(`Retrying '${test.fullTitle()}' due to '${err.message}'`);
                retriedTests.push({test, err});
            })
            .on(mocha.Runner.constants.EVENT_TEST_FAIL, (test, err) => {
                failedTests.push({test, err});
            })
            .on(mocha.Runner.constants.EVENT_RUN_END, () => {
                _.uniqWith(retriedTests
                    .filter(({test}) => !failedTests.find(failed => failed.test === test))
                    .map(({test, err}) => {
                        const {file, line, col} = extractModuleLineAndColumn(err.stack);

                        return {
                            file,
                            line,
                            col,
                            err: err.message,
                            testName: test.fullTitle()
                        };
                    }), _.isEqual)
                    .forEach(({file, line, col, testName, err}) => {
                        issueWarning(`Retried '${testName}' due to '${err}'`, {
                            file,
                            startLine: line,
                            startColumn: col
                        });
                    });
            });
    }
};
