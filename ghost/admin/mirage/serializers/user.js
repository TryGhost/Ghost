import BaseSerializer from './application';
import {RestSerializer} from 'miragejs';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        if (request.queryParams.include && request.queryParams.include.indexOf('roles') >= 0) {
            return ['roles'];
        }

        return [];
    },

    serialize(object, request) {
        if (this.isCollection(object)) {
            return BaseSerializer.prototype.serialize.call(this, object, request);
        }

        let {user} = RestSerializer.prototype.serialize.call(this, object, request);

        if (object.postCount) {
            let posts = object.posts.models.length;

            user.count = {posts};
        }

        return {users: [user]};
    }
});
