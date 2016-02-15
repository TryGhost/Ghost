import Ember from 'ember';

export default Ember.Component.extend({
    willDestroyElement() {
        this._super(...arguments);

        if (this.get('tag.isDeleted') && this.attrs.onDelete) {
            this.attrs.onDelete();
        }
    }
});
