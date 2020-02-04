#!/usr/bin/env node
const prettyCLI = require('@tryghost/pretty-cli');
const ui = require('@tryghost/pretty-cli').ui;
const chalk = require('chalk');
const converter = require('../');

prettyCLI
    .configure({
        name: 'subghost'
    })
    .positional('<source>', {
        paramsDesc: 'Substack CSV file path',
        mustExist: true
    })
    .positional('<dest>', {
        paramsDesc: 'Ghost CSV destination file path. Will write to source if not present',
        mustExist: false
    })
    .parseAndExit()
    .then((argv) => {
        const dest = argv.dest || argv.source;

        ui.log(`Converting Substack CSV file...`);

        return converter(argv.source, dest).then(() => {
            ui.log(`Conversion finished. File written to: ${chalk.cyan(dest)}`);

            process.exit(0);
        }).catch((e) => {
            ui.log(e);
            process.exit(1);
        });
    });
