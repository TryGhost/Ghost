import Component from 'ember-component';
import layout from '../templates/components/koenig-card';

export default Component.extend({
    layout,
    classNames: ['koenig-card'],

    init() {
        this._super(...arguments);
        this.set('isEditing', false);
    },

    actions: {
        save() {
            this.set('doSave', Date.now());
        },

        toggleState() {
            this.set('isEditing', !this.get('isEditing'));
        }
    }
});
