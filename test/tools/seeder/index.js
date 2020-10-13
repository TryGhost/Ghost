const {program} = require('commander');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const migrator = require('../../../core/server/data/db/migrator');
const models = require('../../../core/server/models');
const testUtils = require('../../utils');
const generator = require('./generator');

const DB_PATH = path.join(__dirname, '../../../content/data/ghost-dev.db');

async function setupDatabase() {
    if (fs.existsSync(DB_PATH)) {
        // eslint-disable-next-line no-console
        console.log('sqlite database file exists. Rerun this command after backing up your file with backup command.');
    } else {
        return migrator.dbInit().then(() => {
            // eslint-disable-next-line no-console
            console.log('Database has been set up.');
        });
    }
}

program.version('0.0.1');
program
    .command('backup')
    .description('Back up current SQLite database')
    .action(async () => {
        if (fs.existsSync(DB_PATH)) {
            const filename = `ghost-dev-${moment().format('YYYY-MM-DD-HH-mm-ss')}.db`;
            const backupPath = path.join(__dirname, `../../../content/data/${filename}`);

            await fs.move(DB_PATH, backupPath);

            // eslint-disable-next-line no-console
            console.log(`database file has been backed up to ${filename}`);
        } else {
            // eslint-disable-next-line no-console
            console.log(`sqlite database file does't exist`);
        }
    });

program
    .command('setup')
    .description('Create SQLite database and tables')
    .action(async () => {
        await setupDatabase();
    });

program
    .command('populate <type>')
    .option('-c --count <number>', 'The number of records to create')
    .description('Populate database with data.')
    .action(async (type, options) => {
        models.init();

        const count = options && options.count ? parseInt(options.count) : 1;

        if (type.toLowerCase() === 'post') {
            for (let i = 0; i < count; i++) {
                await models.Post.add(generator.post(), {
                    withRelated: ['author'],
                    context: testUtils.context.owner.context
                });

                if (i > 0 && i % 100 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(`${i} posts are generated.`);
                }
            }

            // eslint-disable-next-line no-console
            console.log('post generation finished.');
            process.exit();
        }

        if (type.toLowerCase() === 'member') {
            for (let i = 0; i < count; i++) {
                await models.Member.add(generator.member(i));

                if (i > 0 && i % 100 === 0) {
                    // eslint-disable-next-line no-console
                    console.log(`${i} members are generated.`);
                }
            }

            // eslint-disable-next-line no-console
            console.log('member generation finished.');
            process.exit();
        }
    });

program
    .command('reset')
    .description('Delete everything')
    .action(async () => {
        if (fs.existsSync(DB_PATH)) {
            await fs.remove(DB_PATH);

            // eslint-disable-next-line no-console
            console.log(`database file has been removed.`);
        } else {
            // eslint-disable-next-line no-console
            console.log(`sqlite database file does't exist.`);
        }

        // eslint-disable-next-line no-console
        console.log('Start the setup process.');

        await setupDatabase();
    });

program.parseAsync(process.argv);
