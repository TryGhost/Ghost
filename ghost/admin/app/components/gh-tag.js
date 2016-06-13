import Ember from 'ember';
import {invokeAction} from 'ember-invoke-action';

const {
    inject: {service},
    Component
} = Ember;

export default Component.extend({
    feature: service(),

    willDestroyElement() {
        this._super(...arguments);

        if (this.get('tag.isDeleted') && this.get('onDelete')) {
            invokeAction(this, 'onDelete');
        }
    }
});
