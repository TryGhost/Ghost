import LinkComponent from '@ember/routing/link-component';
import {computed} from '@ember/object';
import {invokeAction} from 'ember-invoke-action';

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
