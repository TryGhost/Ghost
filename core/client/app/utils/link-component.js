import Ember from 'ember';
import {invokeAction} from 'ember-invoke-action';

const {LinkComponent, computed} = Ember;

LinkComponent.reopen({
    active: computed('attrs.params', '_routing.currentState', function () {
        let isActive = this._super(...arguments);

        if (typeof this.get('alternateActive') === 'function') {
            invokeAction(this, 'alternateActive', isActive);
        }

        return isActive;
    }),

    activeClass: computed('tagName', function () {
        return this.get('tagName') === 'button' ? '' : 'active';
    })
});
