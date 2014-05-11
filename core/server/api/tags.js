var dataProvider = require('../models'),
    tags;


tags = {
    // #### All

    // **takes:** Nothing yet
    all: function browse() {
        // **returns:** a promise for all tags which have previously been used in a json object
        return dataProvider.Tag.findAll();
    }
};

module.exports = tags;