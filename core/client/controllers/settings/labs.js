var LabsController = Ember.Controller.extend(Ember.Evented, {
    uploadButtonText: '导入',
    importErrors: '',

    actions: {
        onUpload: function (file) {
            var self = this,
                formData = new FormData();

            this.set('uploadButtonText', '导入');
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
                self.notifications.showSuccess('导入成功');
            }).catch(function (response) {
                if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                    self.set('importErrors', response.jqXHR.responseJSON.errors);
                }

                self.notifications.showError('导入失败');
            }).finally(function () {
                self.set('uploadButtonText', '导入');
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
