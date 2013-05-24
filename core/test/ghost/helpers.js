(function() {
    "use strict";

    var migrations = {
            one: require("../../shared/data/migration/001")
        },
        helpers;

    helpers = {
        resetData: function () {
            return migrations.one.down().then(function () {
                return migrations.one.up();
            });
        }
    };

    module.exports = helpers;
}());