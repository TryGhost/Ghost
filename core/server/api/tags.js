var dataProvider = require('../models'),
    tags;


tags = {
    browse: function browse(options) {
        return dataProvider.Tag.findAll(options).then(function (result) {
            return { tags: result.toJSON() };
        });
    }
};

module.exports = tags;