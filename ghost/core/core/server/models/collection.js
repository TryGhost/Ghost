const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Collection = ghostBookshelf.Model.extend({
    tableName: 'collections',

    formatOnWrite(attrs) {
        if (attrs.feature_image) {
            attrs.feature_image = urlUtils.toTransformReady(attrs.feature_image);
        }
        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        if (attrs.feature_image) {
            attrs.feature_image = urlUtils.transformReadyToAbsolute(attrs.feature_image);
        }

        return attrs;
    },

    relationships: ['posts'],
    relationshipConfig: {
        posts: {
            editable: false
        }
    },

    relationshipBelongsTo: {
        posts: 'posts'
    },

    filterExpansions() {
        return [{
            key: 'posts',
            replacement: 'posts.id'
        }];
    },

    filterRelations() {
        return {
            posts: {
                tableName: 'posts',
                type: 'manyToMany',
                joinTable: 'collections_posts',
                joinFrom: 'collection_id',
                joinTo: 'post_id'
            }
        };
    },

    permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    posts() {
        return this.belongsToMany(
            'Post',
            'collections_posts',
            'collection_id',
            'post_id',
            'id',
            'id'
        );
    }
});

module.exports = {
    Collection: ghostBookshelf.model('Collection', Collection)
};
