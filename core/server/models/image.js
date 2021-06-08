const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Image = ghostBookshelf.Model.extend({

    tableName: 'images',

    defaults() {
        return {imageable_type: 'feature_image'};
    },

    formatOnWrite(attrs) {
        if (attrs.url) {
            attrs.url = urlUtils.toTransformReady(attrs.url);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        if (attrs.url) {
            attrs.url = urlUtils.transformReadyToAbsolute(attrs.url);
        }

        return attrs;
    },

    post() {
        return this.belongsTo('Post', 'imageable_id');
    },

    // imageable() {
    //     return this.morphTo('imageable', ['Post', 'feature_image']);
    // },

    created_by: function createdBy() {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function updatedBy() {
        return this.belongsTo('User', 'updated_by');
    }
});

const Images = ghostBookshelf.Collection.extend({
    model: Image
});

module.exports = {
    Image: ghostBookshelf.model('Image', Image),
    Images: ghostBookshelf.collection('Images', Images)
};
