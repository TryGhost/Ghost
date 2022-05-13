const _ = require('lodash');
const knex = require('../server/data/db/connection');
const schema = require('../server/data/schema');
const {DateTime} = require('luxon');
const Command = require('./command');

module.exports = class TimeTravel extends Command {
    async handle() {
        // we use logins as the basis for our offset
        const lastLogin = await knex('members_login_events')
            .max('created_at', {as: 'created_at'})
            .first();
    
        const dateOffset = Math.floor(
            DateTime.utc()
                .diff(DateTime.fromJSDate(lastLogin.created_at), 'days')
                .toObject()
                .days
        );

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
