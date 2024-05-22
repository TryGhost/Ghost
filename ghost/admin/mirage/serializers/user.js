import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        if (request.queryParams.include && request.queryParams.include.indexOf('roles') >= 0) {
            return ['roles'];
        }

        return [];
    },

    serialize(userModelOrCollection, request) {
        const updateUser = (user) => {
            user.update('url', `http://localhost:4200/author/${user.slug}/`);

            if (user.postCount) {
                user.update('count', {posts: user.posts.models.length});
            }
        };

        if (this.isModel(userModelOrCollection)) {
            updateUser(userModelOrCollection);
        } else {
            userModelOrCollection.models.forEach(updateUser);
        }

        return BaseSerializer.prototype.serialize.call(this, userModelOrCollection, request);
    }
});
