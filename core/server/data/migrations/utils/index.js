module.exports = {
    ...require('./migrations'),
    ...require('./permissions'),
    ...require('./schema'),
    ...require('./settings'),
    ...require('./tables'),
    meta: {
        MIGRATION_USER: require('./constants').MIGRATION_USER
    }
};
