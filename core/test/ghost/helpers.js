(function() {
    "use strict";

    // Use 'testing' Ghost config
    process.env.NODE_ENV = 'testing';

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