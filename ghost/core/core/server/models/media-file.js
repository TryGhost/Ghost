const ghostBookshelf = require('./base');

const MediaFile = ghostBookshelf.Model.extend({
    tableName: 'media_files',

    usages() {
        return this.hasMany('MediaFileUsage', 'media_file_id', 'id');
    },

    folder() {
        return this.belongsTo('MediaFolder', 'folder_id', 'id');
    },

    searchQuery(queryBuilder, query) {
        queryBuilder.where(function () {
            this.where('media_files.name', 'like', `%${query}%`)
                .orWhere('media_files.url', 'like', `%${query}%`)
                .orWhere('media_files.mime_type', 'like', `%${query}%`);
        });
    }
}, {
    defaultRelations(methodName, options) {
        if (['findOne'].includes(methodName)) {
            options.withRelated = ['usages'];
        }

        return options;
    },

    orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    },

    permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        if (['findPage', 'findAll'].includes(methodName)) {
            options = options.concat(['search']);
        }

        return options;
    }
});

const MediaFiles = ghostBookshelf.Collection.extend({
    model: MediaFile
});

module.exports = {
    MediaFile: ghostBookshelf.model('MediaFile', MediaFile),
    MediaFiles: ghostBookshelf.collection('MediaFiles', MediaFiles)
};
