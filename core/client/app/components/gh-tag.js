import Ember from 'ember';

export default Ember.Component.extend({
    willDestroyElement() {
        this._super(...arguments);

        if (this.get('tag.isDeleted') && this.get('onDelete')) {
            this.get('onDelete')();
        }
    }
});
