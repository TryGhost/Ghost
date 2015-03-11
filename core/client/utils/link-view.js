Ember.LinkView.reopen({
    active: Ember.computed('loadedParams', 'resolvedParams', 'routeArgs', function () {
        var isActive = this._super();

        Ember.set(this, 'alternateActive', isActive);

        return isActive;
    }),

    activeClass: Ember.computed('tagName', function () {
        return this.get('tagName') === 'button' ? '' : 'active';
    })
});
