import {mobileQuery} from 'ghost/utils/mobile';
var PostController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),
    classNameBindings: ['featured'],

    actions: {
        toggleFeatured: function () {
            var options = {disableNProgress: true},
                self = this;

            this.toggleProperty('featured');
            this.get('model').save(options).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        },
        hidePostContent: function () {
            if (mobileQuery.matches) {
                $('.js-content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                $('.js-content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
            }
        },
        showPostContent: function () {
            if (mobileQuery.matches) {
                $('.js-content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
                $('.js-content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
            }
        }
    }
});

export default PostController;
