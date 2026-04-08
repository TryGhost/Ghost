# Example database migrations

## Create a table

See [add mentions table](../../../ghost/core/core/server/data/migrations/versions/5.31/2023-01-19-07-46-add-mentions-table.js).

## Add column(s) to an existing table

See [add source columns to emails table](../../../ghost/core/core/server/data/migrations/versions/5.24/2022-11-21-09-32-add-source-columns-to-emails-table.js).

## Add a setting

See [add member track source setting](../../../ghost/core/core/server/data/migrations/versions/5.21/2022-10-27-09-50-add-member-track-source-setting.js)

## Manipulate data
See [update newsletter subscriptions](../../../ghost/core/core/server/data/migrations/versions/5.31/2022-12-05-09-56-update-newsletter-subscriptions.js).

## Create or modify a database view

View definitions live in `ghost/core/core/server/data/schema/views.js`. The version migration references the shared definition:

```javascript
const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

const VIEW_NAME = 'my_view_name';
const views = require('../../../schema/views');
const viewDef = views.find(v => v.name === VIEW_NAME);

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info(`Creating view: ${VIEW_NAME}`);
        await knex.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME]);
        await knex.raw('CREATE VIEW ?? AS ' + viewDef.body, [VIEW_NAME]);
    },
    async function down(knex) {
        logging.info(`Dropping view: ${VIEW_NAME}`);
        await knex.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME]);
    }
);
```

See [add members effective subscriptions view](../../../ghost/core/core/server/data/migrations/versions/6.27/2026-04-08-10-56-56-add-members-effective-subscriptions-view.js) for a real example.
