import uploader from 'ghost/assets/lib/uploader';

var Markdown = Ember.Component.extend({
    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
    },

    adjustScrollPosition: function () {
        var scrollWrapper = this.get('scrollWrapper'),
            scrollPosition = this.get('scrollPosition');

        scrollWrapper.scrollTop(scrollPosition);
    }.observes('scrollPosition'),

    // fire off 'enable' API function from uploadManager
    // might need to make sure markdown has been processed first
    reInitDropzones: function () {
        Ember.run.scheduleOnce('afterRender', this, function () {
            var dropzones = $('.js-drop-zone'),
                self = this;

            uploader.call(dropzones, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            });

            function boundSendAction(actionName) {
                return function() {
                  self.sendAction.call(self, actionName);
                }
            }

            dropzones.on('uploadstart', boundSendAction('uploadStarted'));
            dropzones.on('uploadfailure', boundSendAction('uploadFinished'));
            dropzones.on('uploadsuccess', boundSendAction('uploadFinished'));
            dropzones.on('uploadsuccess', boundSendAction('uploadSuccess'));
        });
    }.observes('markdown')
});

export default Markdown;
