import base from 'ghost/mixins/editor-base-route';

var EditorNewRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, base, {
    classNames: ['editor'],

    model: function () {
        var self = this;
        return this.get('session.user').then(function (user) {
            return self.store.createRecord('post', {
                author: user
            });
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);

        var psm = this.controllerFor('post-settings-menu');

        // make sure there are no titleObserver functions hanging around
        // from previous posts
        psm.removeObserver('titleScratch', psm, 'titleObserver');

        controller.set('scratch', '');
        controller.set('titleScratch', '');

        // used to check if anything has changed in the editor
        controller.set('previousTagNames', Ember.A());

        // attach model-related listeners created in editor-base-route
        this.attachModelHooks(controller, model);
    }
});

export default EditorNewRoute;
