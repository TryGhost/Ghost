define("ghost/routes/posts/index", 
  ["ghost/routes/mobile-index-route","ghost/mixins/loading-indicator","ghost/utils/mobile","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var MobileIndexRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var mobileQuery = __dependency3__["default"];

    var PostsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
        noPosts: false,

        // Transition to a specific post if we're not on mobile
        beforeModel: function () {
            if (!mobileQuery.matches) {
                return this.goToPost();
            }
        },

        setupController: function (controller, model) {
            /*jshint unused:false*/
            controller.set('noPosts', this.get('noPosts'));
        },

        goToPost: function () {
            var self = this,
                // the store has been populated by PostsRoute
                posts = this.store.all('post'),
                post;

            return this.store.find('user', 'me').then(function (user) {
                post = posts.find(function (post) {
                    // Authors can only see posts they've written
                    if (user.get('isAuthor')) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });

                if (post) {
                    return self.transitionTo('posts.post', post);
                }

                self.set('noPosts', true);
            });
        },

        // Mobile posts route callback
        desktopTransition: function () {
            this.goToPost();
        }
    });

    __exports__["default"] = PostsIndexRoute;
  });