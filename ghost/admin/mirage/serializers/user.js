import BaseSerializer from './application';
import {RestSerializer} from 'ember-cli-mirage';

export default BaseSerializer.extend({
    serialize(object, request) {
        if (this.isCollection(object)) {
            return BaseSerializer.prototype.serialize.apply(this, arguments);
        }

        let {user} = RestSerializer.prototype.serialize.call(this, object, request);

        if (object.postCount) {
            let posts = object.posts.models.length;

            user.count = {posts};
        }

        let roles = BaseSerializer.prototype.serialize.call(this, object.roles, request);
        let [role] = roles.roles;

        if (role) {
            user.roles = [role];
        }

        return {users: [user]};
    }
});
