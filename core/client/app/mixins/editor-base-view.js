import Ember from 'ember';
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
        var $previewViewPort = this.$('.js-entry-preview-content');

        // cache these elements for use in other methods
        this.set('$previewViewPort', $previewViewPort);
        this.set('$previewContent', this.$('.js-rendered-markdown'));

        $previewViewPort.on('scroll', Ember.run.bind($previewViewPort, setScrollClassName, {
            target: this.$('.js-entry-preview'),
            offset: 10
        }));
    },

    removeScrollHandlers: function () {
        this.get('$previewViewPort').off('scroll');
    }.on('willDestroyElement'),

    // updated when gh-ed-editor component scrolls
    editorScrollInfo: null,
    // updated when markdown is rendered
    height: null,

    // HTML Preview listens to scrollPosition and updates its scrollTop value
    // This property receives scrollInfo from the textEditor, and height from the preview pane, and will update the
    // scrollPosition value such that when either scrolling or typing-at-the-end of the text editor the preview pane
    // stays in sync
    scrollPosition: Ember.computed('editorScrollInfo', 'height', function () {
        if (!this.get('editorScrollInfo')) {
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

export default EditorViewMixin;
