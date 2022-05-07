const ghostBookshelf = require('./base');

const ImageBackups = ghostBookshelf.Model.extend({
    tableName: 'image_backups'
});

module.exports = {
    ImageBackups: ghostBookshelf.model('ImageBackups', ImageBackups)
};
