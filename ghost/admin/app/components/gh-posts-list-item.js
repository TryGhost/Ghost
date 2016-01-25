import Ember from 'ember';
import ActiveLinkWrapper from 'ghost/mixins/active-link-wrapper';

const {
    $,
    Component,
    computed,
    inject: {service}
} = Ember;
const {alias, equal} = computed;

export default Component.extend(ActiveLinkWrapper, {
    tagName: 'li',
    classNameBindings: ['isFeatured:featured', 'isPage:page'],

    post: null,
    previewIsHidden: false,

    isFeatured: alias('post.featured'),
    isPage: alias('post.page'),
    isPublished: equal('post.status', 'published'),

    ghostPaths: service(),

    authorName: computed('post.author.name', 'post.author.email', function () {
        return this.get('post.author.name') || this.get('post.author.email');
    }),

    authorAvatar: computed('post.author.image', function () {
        return this.get('post.author.image') || `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    authorAvatarBackground: computed('authorAvatar', function () {
        return Ember.String.htmlSafe(`background-image: url(${this.get('authorAvatar')})`);
    }),

    click() {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick() {
        this.sendAction('onDoubleClick', this.get('post'));
    },

    didInsertElement() {
        this._super(...arguments);
        this.addObserver('active', this, this.scrollIntoView);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.removeObserver('active', this, this.scrollIntoView);
        if (this.get('post.isDeleted') && this.attrs.onDelete) {
            this.attrs.onDelete();
        }
    },

    scrollIntoView() {
        if (!this.get('active')) {
            return;
        }

        let element = this.$();
        let offset = element.offset().top;
        let elementHeight = element.height();
        let container = $('.js-content-scrollbox');
        let containerHeight = container.height();
        let currentScroll = container.scrollTop();
        let isBelowTop, isAboveBottom, isOnScreen;

        isAboveBottom = offset < containerHeight;
        isBelowTop = offset > elementHeight;

        isOnScreen = isBelowTop && isAboveBottom;

        if (!isOnScreen) {
            // Scroll so that element is centered in container
            // 40 is the amount of padding on the container
            container.clearQueue().animate({
                scrollTop: currentScroll + offset - 40 - containerHeight / 2
            });
        }
    }
});
