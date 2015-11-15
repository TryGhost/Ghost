import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

const {Component, run} = Ember;

export default Component.extend({
    classNames: ['content-preview-content'],

    content: null,

    didInsertElement() {
        this._super(...arguments);

        let el = this.$();

        el.on('scroll', run.bind(el, setScrollClassName, {
            target: el.closest('.content-preview'),
            offset: 10
        }));
    },

    didReceiveAttrs(options) {
        this._super(...arguments);

        // adjust when didReceiveAttrs gets both newAttrs and oldAttrs
        if (options.newAttrs.content && this.get('content') !== options.newAttrs.content.value) {
            let el = this.$();

            if (el) {
                el.closest('.content-preview').scrollTop(0);
            }
        }
    },

    willDestroyElement() {
        this._super(...arguments);

        let el = this.$();

        el.off('scroll');
    }
});
