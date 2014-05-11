var migrations = require('../data/migration');

module.exports = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Settings: require('./settings').Settings,
    Tag: require('./tag').Tag,
    Base: require('./base'),
    Session: require('./session').Session,

    init: function () {
        return migrations.init();
    },
    reset: function () {
        return migrations.reset().then(function () {
            return migrations.init();
        });
    },
    isPost: function (jsonData) {
        return jsonData.hasOwnProperty('html') && jsonData.hasOwnProperty('markdown')
            && jsonData.hasOwnProperty('title') && jsonData.hasOwnProperty('slug');
    }
};
