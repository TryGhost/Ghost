var dataProvider = require('../models'),
    tags;


tags = {
    // #### Browse

    // **takes:** Nothing yet
    browse: function browse() {
        // **returns:** a promise for all tags which have previously been used in a json object
        return dataProvider.Tag.findAll().then(function (result) {
            return result.toJSON();
        });
    }
};

module.exports = tags;