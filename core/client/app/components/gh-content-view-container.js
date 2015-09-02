import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    previewIsHidden: false,

    resizeService: Ember.inject.service(),

    _resizeListener: null,

    calculatePreviewIsHidden: function () {
        if (this.$('.content-preview').length) {
            this.set('previewIsHidden', !this.$('.content-preview').is(':visible'));
        }
    },

    didInsertElement: function () {
        this._super(...arguments);
        this._resizeListener = Ember.run.bind(this, this.calculatePreviewIsHidden);
        this.get('resizeService').on('debouncedDidResize', this._resizeListener);
        this.calculatePreviewIsHidden();
    },

    willDestroy: function () {
        this.get('resizeService').off('debouncedDidResize', this._resizeListener);
    }
});
