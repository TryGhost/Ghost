var PostItemView = Ember.View.extend({
    classNameBindings: ['active', 'isFeatured:featured', 'isPage:page'],

    active: null,

    isFeatured: Ember.computed.alias('controller.model.featured'),

    isPage: Ember.computed.alias('controller.model.page'),

    doubleClick: function () {
        this.get('controller').send('openEditor');
    },

    click: function () {
        this.get('controller').send('showPostContent');
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
    },
    removeScrollBehaviour: function () {
        this.removeObserver('active', this, this.scrollIntoView);
    }.on('willDestroyElement'),
    addScrollBehaviour: function () {
        this.addObserver('active', this, this.scrollIntoView);
    }.on('didInsertElement')
});

export default PostItemView;
