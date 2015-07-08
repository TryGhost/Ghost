import Ember from 'ember';

Ember.LinkComponent.reopen({
    active: Ember.computed('attrs.params', '_routing.currentState', function () {
        var isActive = this._super();

        if (typeof this.attrs.alternateActive === 'function') {
            this.attrs.alternateActive(isActive);
        }

        return isActive;
    }),

    activeClass: Ember.computed('tagName', function () {
        return this.get('tagName') === 'button' ? '' : 'active';
    })
});
