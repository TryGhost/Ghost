import BaseSerializer from './application';

export default BaseSerializer.extend({
    // make the tag.count.posts value dynamic
    serialize(tagModelOrCollection, request) {
        let updatePostCount = (tag) => {
            tag.update('count', {posts: tag.postIds.length});
        };

        if (this.isModel(tagModelOrCollection)) {
            updatePostCount(tagModelOrCollection);
        } else {
            tagModelOrCollection.models.forEach(updatePostCount);
        }

        return BaseSerializer.prototype.serialize.call(this, tagModelOrCollection, request);
    }
});
