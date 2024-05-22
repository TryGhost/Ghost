import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(/*request*/) {
        let includes = [];

        includes.push('tags');
        includes.push('authors');

        return includes;
    },

    serialize(postModelOrCollection, request) {
        const updatePost = (post) => {
            if (post.status === 'published') {
                post.update('url', `http://localhost:4200/${post.slug}/`);
            } else {
                post.update('url', `http://localhost:4200/p/`);
            }
        };

        if (this.isModel(postModelOrCollection)) {
            updatePost(postModelOrCollection);
        } else {
            postModelOrCollection.models.forEach(updatePost);
        }

        return BaseSerializer.prototype.serialize.call(this, postModelOrCollection, request);
    }
});
