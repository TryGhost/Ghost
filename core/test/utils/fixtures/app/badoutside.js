var lib = require('../example');

function BadApp(app) {
    this.app = app;
}

BadApp.prototype.install = function () {
    return lib.answer;
};

BadApp.prototype.activate = function () {
};

module.exports = BadApp;
