import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    previewIsHidden: false,

    resizeService: Ember.inject.service(),

    calculatePreviewIsHidden: function () {
        if (this.$('.content-preview').length) {
            this.set('previewIsHidden', !this.$('.content-preview').is(':visible'));
        }
    },

    didInsertElement: function () {
        this._super(...arguments);
        this.calculatePreviewIsHidden();
        this.get('resizeService').on('debouncedDidResize',
            Ember.run.bind(this, this.calculatePreviewIsHidden));
    }
});
