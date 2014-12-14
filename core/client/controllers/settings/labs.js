var LabsController = Ember.ObjectController.extend(Ember.Evented, {
    uploadButtonText: 'Import',
    importErrors: '',

    saveLabs: function (optionName, optionValue) {
        var labsConfig = this.get('labs'),
            labsJSON = (this.get('labs')) ? JSON.parse(labsConfig) : {};

        // Set new value in the JSON object
        labsJSON[optionName] = optionValue;

        this.set('labs', JSON.stringify(labsJSON));

        this.get('model').save().catch(function (errors) {
            self.showErrors(errors);
            self.get('model').rollback();
        });
    },

    useTagsUI: Ember.computed('tagsUI', function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.saveLabs('tagsUI', value);
        }

        // getter
        var labsConfig = (this.get('labs')) ? JSON.parse(this.get('labs')) : false;


        return (labsConfig.tagsUI) ? labsConfig.tagsUI : false;
    }),

    useCodeInjectionUI: Ember.computed('codeInjectionUI', function (key, value) {
        // setter
        if (arguments.length > 1) {
            this.saveLabs('codeInjectionUI', value);
        }

        // getter
        var labsConfig = (this.get('labs')) ? JSON.parse(this.get('labs')) : false;


        return (labsConfig.codeInjectionUI) ? labsConfig.codeInjectionUI : false;
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
