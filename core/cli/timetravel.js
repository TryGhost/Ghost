const Command = require('./command');
const chalk = require('chalk');

// we use logins as the basis for our offset
const datum = {
    table: 'members_login_events',
    column: 'created_at'
};

const helpText = `Updates the Ghost db and shifts all dates up to present day.
By default the offset is based on the date of the last member login.\n
${chalk.red('warning')} This is a destructive operation for testing purposes only. DO NOT run it against a database you care about.`;

module.exports = class TimeTravel extends Command {
    setup() {
        this.help(helpText);
        this.argument('--offset', {type: 'number', desc: 'Specify a date offset (in days)'});
        this.argument('--force', {type: 'boolean', desc: 'Continue without confirmation'});
    }

    async handle(argv = {}) {
        const _ = require('lodash');
        // knex has to be loaded _after_ the call to setup()
        // the db connection requires nconf which passes argv to yargs,
        // which intercepts --help and stops execution
        const knex = require('../server/data/db/connection');
        const schema = require('../server/data/schema');
        const {DateTime} = require('luxon');

        if (!argv.offset) {
            const datumPoint = await knex(datum.table)
                .max(datum.column, {as: datum.column})
                .first();

            if (!datumPoint[datum.column]) {
                this.error('No data to use as baseline. Use --offset instead');
                knex.destroy();
                return;
            }

            argv.offset = Math.floor(
                DateTime.utc()
                    .diff(DateTime.fromJSDate(datumPoint[datum.column]), 'days')
                    .toObject()
                    .days
            );
        }

        const dateOffset = argv.offset;

        this.info(`Timetravel will use an offset of +${dateOffset} days`);
        this.warn('This is a destructive command that will modify your database.');

        const confirm = argv.force || await this.confirm('Are you sure you want to continue?');
        if (!confirm) {
            this.warn('Aborting');
            process.exit(1);
        }

        // map schema to {table: [dateTimeColumn,...]}
        const dateTimeFields = _.pickBy(
            _.mapValues(schema.tables, (table) => {
                return _.keys(_.pickBy(table, (spec) => {
                    return spec.type === 'dateTime';
                }));
            }),
            fields => fields.length > 0
        );

        const totalFields = _.reduce(dateTimeFields, (result, value) => {
            return result + value.length;
        }, 0);
        const progressBar = this.progressBar(totalFields);
        const db = await knex.transaction();
        for (const table in dateTimeFields) {
            for (const column of dateTimeFields[table]) {
                progressBar.update({status: `Updating ${table}.${column}`});
                await db(table)
                    .update(column, db.raw(`DATE_ADD(${column}, interval ${dateOffset} day)`));
                progressBar.increment();
            }
        }
        this.info(`Updated ${totalFields} fields`);
        await db.commit();
        knex.destroy();
    }
};
