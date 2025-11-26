/* eslint-env node */
'use strict';

const chalk = require('chalk');
const semver = require('semver');

/**
 * Check Node.js version compatibility for Ember admin build
 *
 * The esm module (required by dependencies) has compatibility issues with
 * Node.js versions 22.10.0 to 22.17.x. We previously patched esm to work
 * around this, but to avoid maintaining patches, we now check the version
 * and provide clear guidance.
 */
function checkNodeVersion() {
    const nodeVersion = process.version;
    const parsedVersion = semver.parse(nodeVersion);

    /* eslint-disable no-console */

    if (!parsedVersion) {
        console.warn(chalk.yellow(`Warning: Could not parse Node.js version: ${nodeVersion}`));
        return;
    }

    // Check if version is in the problematic range: >=22.10.0 <22.18.0
    const isProblematicVersion = semver.satisfies(nodeVersion, '>=22.10.0 <22.18.0');

    if (isProblematicVersion) {
        console.error('\n');
        console.error(chalk.red('='.repeat(80)));
        console.error(chalk.red('ERROR: Incompatible Node.js version detected'));
        console.error(chalk.red('='.repeat(80)));
        console.error();
        console.error(chalk.yellow(`Current Node.js version: ${chalk.bold(nodeVersion)}`));
        console.error();
        console.error(chalk.white('The Ember admin build requires the esm module, which has compatibility'));
        console.error(chalk.white('issues with Node.js versions 22.10.0 through 22.17.x.'));
        console.error();
        console.error(chalk.white('Please use one of the following Node.js versions:'));
        console.error(chalk.green('  • Node.js 22.18.0 or later'));
        console.error();
        console.error(chalk.white('To switch Node.js versions, you can use a version manager:'));
        console.error(chalk.cyan('  • nvm:    nvm install 22.18.0 && nvm use 22.18.0'));
        console.error();
        console.error(chalk.red('='.repeat(80)));
        console.error();

        process.exit(1);
    }
}

module.exports = checkNodeVersion;
