const MIGRATION_USER = 1;

module.exports = {
    ...require('./migrations'),
    ...require('./permissions'),
    ...require('./schema'),
    ...require('./settings'),
    ...require('./tables'),
    meta: {
        MIGRATION_USER
    }
};
