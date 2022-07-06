import LinkComponent from '@ember/routing/link-component';
import {computed} from '@ember/object';

LinkComponent.reopen({
    active: computed('attrs.params', '_routing.currentState', function () {
        let isActive = this._super(...arguments);

        if (typeof this.alternateActive === 'function') {
            this.alternateActive(isActive);
        }

        return isActive;
    }),

    activeClass: computed('tagName', function () {
        return this.tagName === 'button' ? '' : 'active';
    })
});
