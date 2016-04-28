window.deprecationWorkflow = window.deprecationWorkflow || {};
window.deprecationWorkflow.config = {
    workflow: [
        {handler: 'silence', matchMessage: 'You modified (-join-classes "ember-view" "form-group" (-normalize-class "errorClass" errorClass activeClass=undefined inactiveClass=undefined)) twice in a single render. This was unreliable in Ember 1.x and will be removed in Ember 3.0'}
    ]
};
