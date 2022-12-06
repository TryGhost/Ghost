const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

let Image;
let Images;

Image = ghostBookshelf.Model.extend({

    tableName: 'media_library',

    actionsResourceType: 'image',

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        [
            'image',
            'caption'
        ].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    }
}, {
});

Images = ghostBookshelf.Collection.extend({
    model: Image
});

module.exports = {
    Image: ghostBookshelf.model('Image', Image),
    Images: ghostBookshelf.collection('Images', Images)
};
