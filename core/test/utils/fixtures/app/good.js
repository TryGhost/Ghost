var path = require('path'),
	util = require('./goodlib.js'),
	nested = require('./nested/goodnested');

function GoodApp(app) {
    this.app = app;
}

GoodApp.prototype.install = function () {
    // Goes through app to do data
    this.app.something = 42;
    this.app.util = util;
    this.app.nested = nested;
    this.app.path = path.join(__dirname, 'good.js');

    return true;
};

GoodApp.prototype.activate = function () {
};

module.exports = GoodApp;
