var EditorSaveButtonView = Ember.View.extend({
    templateName: 'editor-save-button',
    tagName: 'section',
    classNames: ['splitbtn', 'js-publish-splitbutton'],

    //Tracks whether we're going to change the state of the post on save
    isDangerous: Ember.computed('controller.isPublished', 'controller.willPublish', function () {
        return this.get('controller.isPublished') !== this.get('controller.willPublish');
    }),

    'publishText': Ember.computed('controller.isPublished', function () {
        return this.get('controller.isPublished') ? 'Update Post' : 'Publish Now';
    }),

    'draftText': Ember.computed('controller.isPublished', function () {
        return this.get('controller.isPublished') ? 'Unpublish' : 'Save Draft';
    }),

    'saveText': Ember.computed('controller.willPublish', function () {
        return this.get('controller.willPublish') ? this.get('publishText') : this.get('draftText');
    }),
});

export default EditorSaveButtonView;
