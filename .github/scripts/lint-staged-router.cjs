#!/usr/bin/env node

const {spawnSync} = require('node:child_process');

const files = process.argv.slice(2).filter(Boolean);

if (files.length === 0) {
    process.exit(0);
}

const adminPrefix = 'apps/admin/';
const adminFiles = [];
const otherFiles = [];

for (const file of files) {
    if (file.startsWith(adminPrefix)) {
        adminFiles.push(file.slice(adminPrefix.length));
    } else {
        otherFiles.push(file);
    }
}

let hasFailure = false;

const run = (command, args) => {
    const result = spawnSync(command, args, {stdio: 'inherit'});

    if (result.status !== 0) {
        hasFailure = true;
    }
};

if (otherFiles.length > 0) {
    run('yarn', ['eslint', ...otherFiles]);
}

if (adminFiles.length > 0) {
    run('yarn', ['workspace', '@tryghost/admin', 'eslint', ...adminFiles]);
}

process.exit(hasFailure ? 1 : 0);
