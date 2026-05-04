const ghostBookshelf = require('./base');

const MediaFileUsage = ghostBookshelf.Model.extend({
    tableName: 'media_file_usages',

    mediaFile() {
        return this.belongsTo('MediaFile', 'media_file_id', 'id');
    }
});

const MediaFileUsages = ghostBookshelf.Collection.extend({
    model: MediaFileUsage
});

module.exports = {
    MediaFileUsage: ghostBookshelf.model('MediaFileUsage', MediaFileUsage),
    MediaFileUsages: ghostBookshelf.collection('MediaFileUsages', MediaFileUsages)
};
