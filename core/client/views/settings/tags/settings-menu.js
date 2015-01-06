var TagsSettingsMenuView = Ember.View.extend({
    saveText: Ember.computed('controller.model.isNew', function () {
        return this.get('controller.model.isNew') ?
            'Add Tag' :
            'Save Tag';
    }),

    // This observer loads and resets the uploader whenever the active tag changes,
    // ensuring that we can reuse the whole settings menu.
    updateUploader: Ember.observer('controller.activeTag.image', 'controller.uploaderReference', function () {
        var uploader = this.get('controller.uploaderReference'),
            image = this.get('controller.activeTag.image');

        if (uploader && uploader[0]) {
            if (image) {
                uploader[0].uploaderUi.initWithImage();
            } else {
                uploader[0].uploaderUi.reset();
            }
        }
    })
});

export default TagsSettingsMenuView;
