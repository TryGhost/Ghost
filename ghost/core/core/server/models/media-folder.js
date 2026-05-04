const ghostBookshelf = require('./base');

const MediaFolder = ghostBookshelf.Model.extend({
    tableName: 'media_folders',

    onSaving(model, attr, options) {
        const self = this;

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        const name = this.get('name') && this.get('name').trim();
        this.set('name', name);

        if (this.hasChanged('slug') || (!this.get('slug') && this.get('name'))) {
            return ghostBookshelf.Model.generateSlug(MediaFolder, this.get('slug') || this.get('name'), {
                transacting: options.transacting
            }).then((slug) => {
                self.set({slug});
            });
        }
    },

    mediaFiles() {
        return this.hasMany('MediaFile', 'folder_id', 'id');
    }
}, {
    orderDefaultOptions() {
        return {
            name: 'ASC'
        };
    }
});

const MediaFolders = ghostBookshelf.Collection.extend({
    model: MediaFolder
});

module.exports = {
    MediaFolder: ghostBookshelf.model('MediaFolder', MediaFolder),
    MediaFolders: ghostBookshelf.collection('MediaFolders', MediaFolders)
};
