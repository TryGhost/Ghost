
var elementLookup = {
    title: '#blog-title',
    description: '#blog-description',
    email: '#email-address',
    postsPerPage: '#postsPerPage'
};

var SettingsGeneralController = Ember.ObjectController.extend({
    isDatedPermalinks: function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.set('permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');
        }

        // getter
        var slugForm = this.get('permalinks');

        return slugForm !== '/:slug/';
    }.property('permalinks'),

    actions: {
        'save': function () {
            // Validate and save settings
            var model = this.get('model'),
                // @TODO: Don't know how to scope this to this controllers view because this.view is null
                errs = model.validate();

            if (errs.length > 0) {
                // Set the actual element from this view based on the error
                errs.forEach(function (err) {
                    // @TODO: Probably should still be scoped to this controllers root element.
                    err.el = $(elementLookup[err.el]);
                });

                // Let the applicationRoute handle validation errors
                this.send('handleValidationErrors', errs);
            } else {
                model.save().then(function () {
                    // @TODO: Notification of success
                    window.alert('Saved data!');
                }, function () {
                    // @TODO: Notification of error
                    window.alert('Error saving data');
                });
            }
        },

        'uploadLogo': function () {
            // @TODO: Integrate with Modal component
        },

        'uploadCover': function () {
            // @TODO: Integrate with Modal component
        }
    }
});

export default SettingsGeneralController;