import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

export default Ember.Component.extend({
    classNames: ['content-preview-content'],

    content: null,

    didRender: function () {
        var el = this.$();

        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-preview'),
            offset: 10
        }));
    },

    didReceiveAttrs: function (options) {
        // adjust when didReceiveAttrs gets both newAttrs and oldAttrs
        if (options.newAttrs.content && this.get('content') !== options.newAttrs.content.value) {
            let el = this.$();

            if (el) {
                el.closest('.content-preview').scrollTop(0);
            }
        }
    },

    willDestroyElement: function () {
        var el = this.$();

        el.off('scroll');
    }
});
