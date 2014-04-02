Ember.LinkView.reopen({
    active: Ember.computed('resolvedParams', 'routeArgs', function () {
        var isActive = this._super();

        Ember.set(this, 'alternateActive', isActive);

        return isActive;
    })
});
