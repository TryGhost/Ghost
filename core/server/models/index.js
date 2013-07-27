var migrations = require('../data/migration');

module.exports = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Settings: require('./settings').Settings,
    init: function () {
        return migrations.init();
    }
};
