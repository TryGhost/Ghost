import Component from 'ember-component';
import injectService from 'ember-service/inject';
import {invokeAction} from 'ember-invoke-action';

export default Component.extend({
    feature: injectService(),

    willDestroyElement() {
        this._super(...arguments);

        if (this.get('tag.isDeleted') && this.get('onDelete')) {
            invokeAction(this, 'onDelete');
        }
    }
});
