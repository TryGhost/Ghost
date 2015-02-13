var LabsController = Ember.Controller.extend(Ember.Evented, {
    needs: ['feature'],

    uploadButtonText: 'Import',
    importErrors: '',
    labsJSON: Ember.computed('model.labs', function () {
        return JSON.parse(this.get('model.labs') || {});
    }),

    saveLabs: function (optionName, optionValue) {
        var self = this,
            labsJSON =  this.get('labsJSON');

        // Set new value in the JSON object
        labsJSON[optionName] = optionValue;

        this.set('model.labs', JSON.stringify(labsJSON));

        this.get('model').save().catch(function (errors) {
            self.showErrors(errors);
            self.get('model').rollback();
        });
    },

    codeUIFlag: Ember.computed.alias('config.codeInjectionUI'),

    useCodeInjectionUI: Ember.computed('controllers.feature.codeInjectionUI', function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.saveLabs('codeInjectionUI', value);
        }

        // getter
        return this.get('controllers.feature.codeInjectionUI') || false;
    }),

    actions: {
        onUpload: function (file) {
            var self = this,
                formData = new FormData();

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', '');
            this.notifications.closePassive();

            formData.append('importfile', file);

            ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false
            }).then(function () {
                // Clear the store, so that all the new data gets fetched correctly.
                self.store.unloadAll('post');
                self.store.unloadAll('tag');
                self.store.unloadAll('user');
                self.store.unloadAll('role');
                self.store.unloadAll('setting');
                self.store.unloadAll('notification');
                self.notifications.showSuccess('Import successful.');
            }).catch(function (response) {
                if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                    self.set('importErrors', response.jqXHR.responseJSON.errors);
                }

                self.notifications.showError('Import Failed');
            }).finally(function () {
                self.set('uploadButtonText', 'Import');
                self.trigger('reset');
            });
        },

        exportData: function () {
            var iframe = $('#iframeDownload'),
                downloadURL = this.get('ghostPaths.url').api('db') +
                    '?access_token=' + this.get('session.access_token');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        sendTestEmail: function () {
            var self = this;

            ic.ajax.request(this.get('ghostPaths.url').api('mail', 'test'), {
                type: 'POST'
            }).then(function () {
                self.notifications.showSuccess('Check your email for the test message.');
            }).catch(function (error) {
                if (typeof error.jqXHR !== 'undefined') {
                    self.notifications.showAPIError(error);
                } else {
                    self.notifications.showErrors(error);
                }
            });
        }
    }
});

export default LabsController;
