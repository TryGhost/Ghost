import MobileParentView from 'ghost/views/mobile/parent-view';

var PostsView = MobileParentView.extend({
    classNames: ['content-view-container'],
    tagName: 'section',

    // Mobile parent view callbacks
    showMenu: function () {
        $('.js-content-list, .js-content-preview').addClass('show-menu').removeClass('show-content');
    },
    showContent: function () {
        $('.js-content-list, .js-content-preview').addClass('show-content').removeClass('show-menu');
    },
    showAll: function () {
        $('.js-content-list, .js-content-preview').removeClass('show-menu show-content');
    }
});

export default PostsView;
