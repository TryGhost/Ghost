import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: ['gh-view'],

    scheduleAfterRender: function () {
        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    didInsertElement: function () {
        this.scheduleAfterRender();
    },

    afterRenderEvent: function () {
        var $previewViewPort = this.$('.js-entry-preview-content');

        // cache these elements for use in other methods
        this.set('$previewViewPort', $previewViewPort);
        this.set('$previewContent', this.$('.js-rendered-markdown'));

        $previewViewPort.on('scroll', Ember.run.bind($previewViewPort, setScrollClassName, {
            target: this.$('.js-entry-preview'),
            offset: 10
        }));
    },

    willDestroyElement: function () {
        // removes scroll handlers from the view
        this.get('$previewViewPort').off('scroll');
    },

    // updated when gh-ed-editor component scrolls
    editorScrollInfo: null,
    // updated when markdown is rendered
    height: null,

    // HTML Preview listens to scrollPosition and updates its scrollTop value
    // This property receives scrollInfo from the textEditor, and height from the preview pane, and will update the
    // scrollPosition value such that when either scrolling or typing-at-the-end of the text editor the preview pane
    // stays in sync
    scrollPosition: Ember.computed('editorScrollInfo', 'height', function () {
        if (!this.get('editorScrollInfo') || !this.get('$previewContent') || !this.get('$previewViewPort')) {
            return 0;
        }

        var scrollInfo = this.get('editorScrollInfo'),
            previewHeight = this.get('$previewContent').height() - this.get('$previewViewPort').height(),
            previewPosition,
            ratio;

        ratio = previewHeight / scrollInfo.diff;
        previewPosition = scrollInfo.top * ratio;

        return previewPosition;
    })
});
