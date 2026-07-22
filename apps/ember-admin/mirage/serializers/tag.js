import BaseSerializer from './application';

export default BaseSerializer.extend({
    // make the tag.count.posts and url values dynamic
    serialize(tagModelOrCollection, request) {
        let updatePost = (tag) => {
            tag.update('count', {posts: tag.postIds.length});
            tag.update('url', `http://localhost:4200/tag/${tag.slug}/`);
        };

        if (this.isModel(tagModelOrCollection)) {
            updatePost(tagModelOrCollection);
        } else {
            tagModelOrCollection.models.forEach(updatePost);
        }

        return BaseSerializer.prototype.serialize.call(this, tagModelOrCollection, request);
    }
});
