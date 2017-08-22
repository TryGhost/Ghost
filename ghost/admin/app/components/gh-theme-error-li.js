import Component from '@ember/component';

export default Component.extend({
    tagName: '',
    error: null,
    showDetails: false,

    actions: {
        toggleDetails() {
            this.toggleProperty('showDetails');
        }
    }
});
