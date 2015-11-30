import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

export default AuthenticatedRoute.extend(ShortcutsRoute, PaginationRouteMixin, {
    titleToken: 'Content',

    paginationModel: 'post',
    paginationSettings: {
        status: 'all',
        staticPages: 'all'
    },

    model() {
        let paginationSettings = this.get('paginationSettings');

        return this.get('session.user').then((user) => {
            if (user.get('isAuthor')) {
                paginationSettings.filter = paginationSettings.filter ?
                    `${paginationSettings.filter}+author:${user.get('slug')}` : `author:${user.get('slug')}`;
            }

            return this.loadFirstPage().then(() => {
                // using `.filter` allows the template to auto-update when new models are pulled in from the server.
                // we just need to 'return true' to allow all models by default.
                return this.store.filter('post', (post) => {
                    if (user.get('isAuthor')) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });
            });
        });
    },

    stepThroughPosts(step) {
        let currentPost = this.get('controller.currentPost');
        let posts = this.get('controller.sortedPosts');
        let length = posts.get('length');
        let newPosition = posts.indexOf(currentPost) + step;

        // if we are on the first or last item
        // just do nothing (desired behavior is to not
        // loop around)
        if (newPosition >= length) {
            return;
        } else if (newPosition < 0) {
            return;
        }

        this.transitionTo('posts.post', posts.objectAt(newPosition));
    },

    scrollContent(amount) {
        let content = Ember.$('.js-content-preview');
        let scrolled = content.scrollTop();

        content.scrollTop(scrolled + 50 * amount);
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        left: 'focusList',
        right: 'focusContent',
        c: 'newPost'
    },

    actions: {
        focusList() {
            this.controller.set('keyboardFocus', 'postList');
        },

        focusContent() {
            this.controller.set('keyboardFocus', 'postContent');
        },

        newPost() {
            this.transitionTo('editor.new');
        },

        moveUp() {
            if (this.controller.get('postContentFocused')) {
                this.scrollContent(-1);
            } else {
                this.stepThroughPosts(-1);
            }
        },

        moveDown() {
            if (this.controller.get('postContentFocused')) {
                this.scrollContent(1);
            } else {
                this.stepThroughPosts(1);
            }
        }
    }
});
