function KudosApp(app) {
    this.app = app;
}

KudosApp.prototype.install = function () {
    return true;
};

KudosApp.prototype.activate = function () {

};

module.exports = KudosApp;