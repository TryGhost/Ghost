const {createDropColumnMigration} = require('../../utils');

// Preferably I could use `createIrreversibleMigration` here like
// `createIrreversibleMigration(createDropColumnMigration(...).up)` but
// that seems to throw some obscure error that I'm not sure about... something
// to look into for the future
module.exports = {
    ...createDropColumnMigration('webhooks', 'status', {}),

    down: async () => {
        // no-op: we're setting this migration to irreversible so we won't
        // execute the `down`
    },

    config: {
        irreversible: true
    }
};