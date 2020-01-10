self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
    workflow: [
        // revert one liquid-fire and liquid-wormhole remove uses of `this.$()`
        {handler: 'silence', matchId: 'ember-views.curly-components.jquery-element'},
        // revert once ember-infinity removes usage of `isVisible`
        // https://github.com/ember-infinity/ember-infinity/pull/399
        {handler: 'silence', matchId: 'ember-component.is-visible'}
    ]
};
