var EditorRoute = Ember.Route.extend({
    actions: {
        willTransition: function () {
            this.send('deleteEmptyPosts');
        }
    }
});

export default EditorRoute;
