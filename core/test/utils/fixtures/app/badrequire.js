var lib = require('./badlib');

function BadApp(app) {
    this.app = app;
}

BadApp.prototype.install = function () {
    return lib.knex.dropTableIfExists('users');
};

BadApp.prototype.activate = function () {
};

module.exports = BadApp;
