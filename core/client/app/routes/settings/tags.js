import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import PaginationRoute from 'ghost/mixins/pagination-route';

export default AuthenticatedRoute.extend(CurrentUserSettings, PaginationRoute, ShortcutsRoute, {
    titleToken: 'Settings - Tags',

    paginationModel: 'tag',
    paginationSettings: {
        include: 'post_count',
        limit: 15
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        left: 'focusList',
        right: 'focusContent',
        c: 'newTag'
    },

    beforeModel: function () {
        this._super(...arguments);

        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model: function () {
        this.store.unloadAll('tag');

        return this.loadFirstPage().then(() => {
            return this.store.filter('tag', (tag) => {
                return !tag.get('isNew');
            });
        });
    },

    deactivate: function () {
        this.send('resetPagination');
    },

    stepThroughTags: function (step) {
        let currentTag = this.modelFor('settings.tags.tag'),
            tags = this.get('controller.tags'),
            length = tags.get('length');

        if (currentTag && length) {
            let newPosition = tags.indexOf(currentTag) + step;

            if (newPosition >= length) {
                return;
            } else if (newPosition < 0) {
                return;
            }

            this.transitionTo('settings.tags.tag', tags.objectAt(newPosition));
        }
    },

    scrollContent: function (amount) {
        let content = Ember.$('.tag-settings-pane'),
            scrolled = content.scrollTop();

        content.scrollTop(scrolled + 50 * amount);
    },

    actions: {
        moveUp: function () {
            if (this.controller.get('tagContentFocused')) {
                this.scrollContent(-1);
            } else {
                this.stepThroughTags(-1);
            }
        },

        moveDown: function () {
            if (this.controller.get('tagContentFocused')) {
                this.scrollContent(1);
            } else {
                this.stepThroughTags(1);
            }
        },

        focusList: function () {
            this.set('controller.keyboardFocus', 'tagList');
        },

        focusContent: function () {
            this.set('controller.keyboardFocus', 'tagContent');
        },

        newTag: function () {
            this.transitionTo('settings.tags.new');
        }
    }
});
