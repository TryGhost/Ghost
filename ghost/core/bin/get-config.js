#!/usr/bin/env node

/**
 * Outputs a Ghost config value to stdout.
 *
 * Usage: node bin/get-config.js <key>
 * Example: node bin/get-config.js url
 */

const path = require('path');
const loader = require('../core/shared/config/loader');

const key = process.argv[2];

if (!key) {
    // eslint-disable-next-line no-console
    console.error('Usage: get-config <key>');
    process.exit(1);
}

const nconf = loader.loadNconf({customConfigPath: path.join(__dirname, '..')});
const value = nconf.get(key);

if (value !== undefined) {
    process.stdout.write(String(value));
}
