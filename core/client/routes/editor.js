var EditorRoute = Ember.Route.extend({
    actions: {
        willTransition: function (transition) {
            // If leaving the editor routes,
            // delete empty post model.
            if (!/^editor/.test(transition.targetName)) {
                this.send('deleteEmptyPosts');
            }
        }
    }
});

export default EditorRoute;
