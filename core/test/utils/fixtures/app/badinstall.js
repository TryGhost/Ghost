function BadApp(app) {
    this.app = app;
}

BadApp.prototype.install = function () {
    var knex = require('knex');

    return knex.dropTableIfExists('users');
};

BadApp.prototype.activate = function () {
};

module.exports = BadApp;
