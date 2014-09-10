import {mobileQuery} from 'ghost/utils/mobile';

var PostsView = Ember.View.extend({
    classNames: ['content-view-container'],
    tagName: 'section',

    resetMobileView: function (mq) {
        if (!mq.matches) {
            $('.js-content-list').removeAttr('style');
            $('.js-content-preview').removeAttr('style');
        }
    },
    attachResetMobileView: function () {
        mobileQuery.addListener(this.resetMobileView);
    }.on('didInsertElement'),
    detachResetMobileView: function () {
        mobileQuery.removeListener(this.resetMobileView);
    }.on('willDestroyElement')
});

export default PostsView;
