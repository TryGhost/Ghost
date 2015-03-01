define("ghost/routes/editor/edit", 
  ["ghost/routes/authenticated","ghost/mixins/editor-base-route","ghost/utils/isNumber","ghost/utils/isFinite","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var base = __dependency2__["default"];
    var isNumber = __dependency3__["default"];
    var isFinite = __dependency4__["default"];

    var EditorEditRoute = AuthenticatedRoute.extend(base, {
        titleToken: 'Editor',

        model: function (params) {
            var self = this,
                post,
                postId,
                query;

            postId = Number(params.post_id);

            if (!isNumber(postId) || !isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo('error404', 'editor/' + params.post_id);
            }

            post = this.store.getById('post', postId);
            if (post) {
                return post;
            }

            query = {
                id: postId,
                status: 'all',
                staticPages: 'all'
            };

            return self.store.find('post', query).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return post;
                }

                return self.replaceWith('posts.index');
            });
        },

        afterModel: function (post) {
            var self = this;

            return self.store.find('user', 'me').then(function (user) {
                if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                    return self.replaceWith('posts.index');
                }
            });
        },

        actions: {
             authorizationFailed: function () {
                this.send('openModal', 'signin');
            }
        }
    });

    __exports__["default"] = EditorEditRoute;
  });