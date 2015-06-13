import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'li',
    classNameBindings: ['active', 'isFeatured:featured', 'isPage:page'],

    post: null,
    active: false,

    ghostPaths: Ember.inject.service('ghost-paths'),

    isFeatured: Ember.computed.alias('post.featured'),

    isPage: Ember.computed.alias('post.page'),

    isPublished: Ember.computed.equal('post.status', 'published'),

    authorName: Ember.computed('post.author.name', 'post.author.email', function () {
        return this.get('post.author.name') || this.get('post.author.email');
    }),

    authorAvatar: Ember.computed('post.author.image', function () {
        return this.get('post.author.image') || this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    authorAvatarBackground: Ember.computed('authorAvatar', function () {
        return `background-image: url(${this.get('authorAvatar')})`.htmlSafe();
    }),

    click: function () {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick: function () {
        this.sendAction('onDoubleClick', this.get('post'));
    },

    didInsertElement: function () {
        this.addObserver('active', this, this.scrollIntoView);
    },

    willDestroyElement: function () {
        this.removeObserver('active', this, this.scrollIntoView);
    },

    scrollIntoView: function () {
        if (!this.get('active')) {
            return;
        }

        var element = this.$(),
            offset = element.offset().top,
            elementHeight = element.height(),
            container = Ember.$('.js-content-scrollbox'),
            containerHeight = container.height(),
            currentScroll = container.scrollTop(),
            isBelowTop,
            isAboveBottom,
            isOnScreen;

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
