var EditorSaveButtonView = Ember.View.extend({
    templateName: 'editor-save-button',
    tagName: 'section',
    classNames: ['js-publish-splitbutton'],
    classNameBindings: ['isDangerous:splitbutton-delete:splitbutton-save'],

    //Tracks whether we're going to change the state of the post on save
    isDangerous: function () {
        return this.get('controller.isPublished') !== this.get('controller.willPublish');
    }.property('controller.isPublished', 'controller.willPublish'),

    'save-text': function () {
        return this.get('controller.willPublish') ? this.get('publish-text') : this.get('draft-text');
    }.property('controller.willPublish'),

    'publish-text': function () {
        return this.get('controller.isPublished') ? 'Update Post' : 'Publish Now';
    }.property('controller.isPublished'),

    'draft-text': function () {
        return this.get('controller.isPublished') ? 'Unpublish' : 'Save Draft';
    }.property('controller.isPublished')
});

export default EditorSaveButtonView;
