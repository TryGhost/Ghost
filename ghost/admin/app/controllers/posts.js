import Ember from 'ember';

const {
    Controller,
    compare,
    computed,
    inject: {service}
} = Ember;
const {equal} = computed;

export default Controller.extend({
    feature: service(),

    showDeletePostModal: false,

    // See PostsRoute's shortcuts
    postListFocused: equal('keyboardFocus', 'postList'),
    postContentFocused: equal('keyboardFocus', 'postContent'),

    sortedPosts: computed('model.@each.{status,publishedAtUTC,isNew,updatedAtUTC}', function () {
        return this.get('model').toArray().sort(compare);
    }),

    actions: {
        toggleDeletePostModal() {
            this.toggleProperty('showDeletePostModal');
        }
    }
});
