import Ember from 'ember';

const {LinkComponent, computed} = Ember;

LinkComponent.reopen({
    active: computed('attrs.params', '_routing.currentState', function () {
        let isActive = this._super(...arguments);

        if (typeof this.attrs.alternateActive === 'function') {
            this.attrs.alternateActive(isActive);
        }

        return isActive;
    }),

    activeClass: computed('tagName', function () {
        return this.get('tagName') === 'button' ? '' : 'active';
    })
});
