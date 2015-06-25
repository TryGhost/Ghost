import Ember from 'ember';

Ember.LinkComponent.reopen({
    active: Ember.computed('attrs.params', '_routing.currentState', function () {
        var isActive = this._super();

        Ember.set(this, 'alternateActive', isActive);

        return isActive;
    }),

    activeClass: Ember.computed('tagName', function () {
        return this.get('tagName') === 'button' ? '' : 'active';
    })
});
