import MobileParentView from 'ghost/views/mobile/parent-view';

var PostsView = MobileParentView.extend({
    classNames: ['content-view-container'],
    tagName: 'section',

    // Mobile parent view callbacks
    showMenu: function () {
        $('.js-content-list').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
        $('.js-content-preview').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
    },
    showContent: function () {
        $('.js-content-list').animate({right: '100%', left: '-100%', 'margin-right': '15px'}, 300);
        $('.js-content-preview').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
    },
    showAll: function () {
        $('.js-content-list').removeAttr('style');
        $('.js-content-preview').removeAttr('style');
    }
});

export default PostsView;
