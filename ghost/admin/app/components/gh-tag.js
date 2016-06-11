import Ember from 'ember';
import {invokeAction} from 'ember-invoke-action';

const {Component} = Ember;

export default Component.extend({
    willDestroyElement() {
        this._super(...arguments);

        if (this.get('tag.isDeleted') && this.get('onDelete')) {
            invokeAction(this, 'onDelete');
        }
    }
});
