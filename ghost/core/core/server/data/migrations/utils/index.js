module.exports = {
    ...require('./migrations'),
    ...require('./permissions'),
    ...require('./roles'),
    ...require('./schema'),
    ...require('./settings'),
    ...require('./tables')
};
