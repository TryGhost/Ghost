import BaseSerializer from './application';
import {camelize} from '@ember/string';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        const queryIncludes = (request.queryParams.include || '').split(',').compact().map(camelize);
        const includes = new Set(queryIncludes);

        // embedded records that are included by default in the API
        includes.add('tags');
        includes.add('authors');
        includes.add('tiers');

        // clean up some things that mirage doesn't understand
        includes.delete('authorsRoles');
        includes.delete('countClicks');
        includes.delete('postRevisionsAuthor');
        includes.delete('tiers');

        const result = Array.from(includes);
        return result;
    },

    serialize(postModelOrCollection, request) {
        const updatePost = (post) => {
            if (post.status === 'published') {
                post.update('url', `http://localhost:4200/${post.slug}/`);
            } else {
                post.update('url', `http://localhost:4200/p/${post.uuid}/`);
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
