var migrations = require('../data/migration');

module.exports = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Settings: require('./settings').Settings,
    init: function () {
        return migrations.init();
    },
    reset: function () {
        return migrations.reset().then(function () {
            return migrations.init();
        });
    },
    isPost: function (jsonData) {
        return jsonData.hasOwnProperty("content") && jsonData.hasOwnProperty("content_raw")
            && jsonData.hasOwnProperty("title") && jsonData.hasOwnProperty("slug");
    }
};
