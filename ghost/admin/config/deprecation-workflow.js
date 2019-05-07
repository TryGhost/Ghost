self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
    workflow: [
        {handler: 'silence', matchId: 'ember-views.curly-components.jquery-element'},
        {handler: 'silence', matchId: 'computed-property.override'},
        {handler: 'silence', matchId: 'application-controller.router-properties'},
        {handler: 'silence', matchId: 'events.remove-all-listeners'},
        {handler: 'silence', matchId: 'ember-polyfills.deprecate-merge'},
        {handler: 'silence', matchId: 'events.inherited-function-listeners'},
        {handler: 'silence', matchId: 'ember-component.send-action'}
    ]
};
