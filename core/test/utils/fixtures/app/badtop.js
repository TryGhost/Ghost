var knex = require('knex');

function BadApp(app) {
    this.app = app;
}

BadApp.prototype.install = function () {
    return knex.dropTableIfExists('users');
};

BadApp.prototype.activate = function () {
};

module.exports = BadApp;
