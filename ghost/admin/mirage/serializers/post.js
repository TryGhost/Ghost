import BaseSerializer from './application';
import {RestSerializer} from 'ember-cli-mirage';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        if (request.queryParams.include && request.queryParams.include.indexOf('tags') >= 0) {
            return ['tags'];
        }

        return [];
    },

    serialize(object, request) {
        if (this.isCollection(object)) {
            return BaseSerializer.prototype.serialize.apply(this, arguments);
        }

        let {post} = RestSerializer.prototype.serialize.call(this, object, request);

        if (object.author) {
            post.author = object.author.id;
        }

        return {posts: [post]};
    }
});
