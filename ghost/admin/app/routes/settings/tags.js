/* global key */
import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import PaginationMixin from 'ghost-admin/mixins/pagination';

export default AuthenticatedRoute.extend(CurrentUserSettings, PaginationMixin, ShortcutsRoute, {
    titleToken: 'Settings - Tags',

    paginationModel: 'tag',
    paginationSettings: {
        include: 'count.posts',
        limit: 15
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        left: 'focusList',
        right: 'focusContent',
        c: 'newTag'
    },

    beforeModel() {
        this._super(...arguments);

        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model(params, transition) {
        return this.loadFirstPage(transition).then(() => {
            return this.store.filter('tag', (tag) => {
                return !tag.get('isNew');
            });
        });
    },

    deactivate() {
        this._super(...arguments);
        this.send('resetShortcutsScope');
        this.send('resetPagination');
    },

    stepThroughTags(step) {
        let currentTag = this.modelFor('settings.tags.tag');
        let tags = this.get('controller.tags');
        let length = tags.get('length');

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

    scrollContent(amount) {
        let content = $('.tag-settings-pane');
        let scrolled = content.scrollTop();

        content.scrollTop(scrolled + 50 * amount);
    },

    actions: {
        moveUp() {
            if (this.controller.get('tagContentFocused')) {
                this.scrollContent(-1);
            } else {
                this.stepThroughTags(-1);
            }
        },

        moveDown() {
            if (this.controller.get('tagContentFocused')) {
                this.scrollContent(1);
            } else {
                this.stepThroughTags(1);
            }
        },

        focusList() {
            this.set('controller.keyboardFocus', 'tagList');
        },

        focusContent() {
            this.set('controller.keyboardFocus', 'tagContent');
        },

        newTag() {
            this.transitionTo('settings.tags.new');
        },

        resetShortcutsScope() {
            key.setScope('default');
        }
    }
});
