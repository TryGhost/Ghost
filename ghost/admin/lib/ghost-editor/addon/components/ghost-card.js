import Ember from 'ember';
import layout from '../templates/components/ghost-card';

export default Ember.Component.extend({
    layout,
    classNames: ['ghost-card'],
    actions: {
        save() {
            this.set('doSave', Date.now());
        },
        toggleState() {
            this.set('isEditing', !this.get('isEditing'));
        }
    },
    init() {
        this._super(...arguments);
        this.set('isEditing', false);
    }
});
