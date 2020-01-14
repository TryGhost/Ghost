self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
    workflow: [
        // remove once ember-drag-drop removes usage of Component#sendAction
        // https://github.com/mharris717/ember-drag-drop/issues/155
        {handler: 'silence', matchId: 'ember-component.send-action'},

        // remove once liquid-fire and liquid-wormhole remove uses of `this.$()`
        {handler: 'silence', matchId: 'ember-views.curly-components.jquery-element'},

        // remove once ember-infinity removes usage of `isVisible`
        // https://github.com/ember-infinity/ember-infinity/pull/399
        {handler: 'silence', matchId: 'ember-component.is-visible'}
    ]
};
