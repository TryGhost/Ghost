import Ember from 'ember';
import Controller from 'ember-controller';
import computed, {equal} from 'ember-computed';
import injectService from 'ember-service/inject';

const {compare} = Ember;

export default Controller.extend({
    feature: injectService(),

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
