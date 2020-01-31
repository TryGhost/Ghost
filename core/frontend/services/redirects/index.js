module.exports = {
    init: function () {
        return this.settings.migrate();
    },

    get settings() {
        return require('./settings');
    },

    get validation() {
        return require('./validation');
    }
};
