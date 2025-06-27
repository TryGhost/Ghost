module.exports = {
    ...require('./migrations'),
    ...require('./permissions'),
    ...require('./schema'),
    ...require('./settings'),
    ...require('./tables')
};
