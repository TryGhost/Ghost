import Ember from 'ember';

const {Component} = Ember;

export default Component.extend({
    classNames: ['content-preview-content'],

    content: null,

    didReceiveAttrs(options) {
        this._super(...arguments);

        // adjust when didReceiveAttrs gets both newAttrs and oldAttrs
        if (options.newAttrs.content && this.get('content') !== options.newAttrs.content.value) {
            let el = this.$();

            if (el) {
                el.closest('.content-preview').scrollTop(0);
            }
        }
    }
});
