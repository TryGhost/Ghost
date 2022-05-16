const _ = require('lodash');
const knex = require('../server/data/db/connection');
const schema = require('../server/data/schema');
const {DateTime} = require('luxon');
const Command = require('./command');

// we use logins as the basis for our offset
const datum = {
    table: 'members_login_events',
    column: 'created_at'
};

module.exports = class TimeTravel extends Command {
    async handle() {
        const datumPoint = await knex(datum.table)
            .max(datum.column, {as: datum.column})
            .first();

        const dateOffset = Math.floor(
            DateTime.utc()
                .diff(DateTime.fromJSDate(datumPoint[datum.column]), 'days')
                .toObject()
                .days
        );

        this.info(`Timetravel will use an offset of +${dateOffset} days`);
        this.warn('This is a destructive command that will modify your database.');

        const confirm = await this.confirm('Are you sure you want to continue?');
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

        const db = await knex.transaction();
        for (const table in dateTimeFields) {
            for (const column of dateTimeFields[table]) {
                this.info(`updating ${table}.${column}`);
                await db(table)
                    .update(column, db.raw(`DATE_ADD(${column}, interval ${dateOffset} day)`));
            }
        }
        await db.commit();
        knex.destroy();
    }
};
