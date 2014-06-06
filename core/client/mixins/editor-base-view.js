import setScrollClassName from 'ghost/utils/set-scroll-classname';

var EditorViewMixin = Ember.Mixin.create({
    // create a hook for jQuery logic that will run after
    // a view and all child views have been rendered,
    // since didInsertElement runs only when the view's el
    // has rendered, and not necessarily all child views.
    //
    // http://mavilein.github.io/javascript/2013/08/01/Ember-JS-After-Render-Event/
    // http://emberjs.com/api/classes/Ember.run.html#method_next
    scheduleAfterRender: function () {
        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    }.on('didInsertElement'),

    // all child views will have rendered when this fires
    afterRenderEvent: function () {
        var $previewViewPort = this.$('.entry-preview-content');

        // cache these elements for use in other methods
        this.set('$previewViewPort', $previewViewPort);
        this.set('$previewContent', this.$('.rendered-markdown'));

        $previewViewPort.scroll(Ember.run.bind($previewViewPort, setScrollClassName, {
            target: this.$('.entry-preview'),
            offset: 10
        }));
    },

    removeScrollHandlers: function () {
        this.get('$previewViewPort').off('scroll');
    }.on('willDestroyElement'),

    // updated when gh-codemirror component scrolls
    markdownScrollInfo: null,

    // percentage of scroll position to set htmlPreview
    scrollPosition: Ember.computed('markdownScrollInfo', function () {
        if (!this.get('markdownScrollInfo')) {
            return 0;
        }

        var scrollInfo = this.get('markdownScrollInfo'),
            codemirror = scrollInfo.codemirror,
            markdownHeight = scrollInfo.height - scrollInfo.clientHeight,
            previewHeight = this.get('$previewContent').height() - this.get('$previewViewPort').height(),
            ratio = previewHeight / markdownHeight,
            previewPosition = scrollInfo.top * ratio,
            isCursorAtEnd = codemirror.getCursor('end').line > codemirror.lineCount() - 5;

        if (isCursorAtEnd) {
            previewPosition = previewHeight + 30;
        }

        return previewPosition;
    })
});

export default EditorViewMixin;
