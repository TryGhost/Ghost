import {responsiveAction} from 'ghost/utils/mobile';

var PostsView = Ember.View.extend({
    classNames: ['content-view-container'],
    tagName: 'section',

    mobileInteractions: function () {
        Ember.run.scheduleOnce('afterRender', this, function () {
            // ### Show content preview when swiping left on content list
            $('.manage').on('click', '.content-list ol li', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
                    $('.content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
                });
            });

            // ### Hide content preview
            $('.manage').on('click', '.content-preview .button-back', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                    $('.content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
                });
            });
        });
    }.on('didInsertElement'),
});

export default PostsView;
