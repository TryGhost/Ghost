var EditorSaveButtonView = Ember.View.extend({
    templateName: 'editor-save-button',
    tagName: 'section',
    classNames: ['splitbtn', 'js-publish-splitbutton'],

    // Tracks whether we're going to change the state of the post on save
    isDangerous: Ember.computed('controller.isPublished', 'controller.willPublish', function () {
        return this.get('controller.isPublished') !== this.get('controller.willPublish');
    }),


    publishText: Ember.computed('controller.isPublished', function () {
        return this.get('controller.isPublished') ? '更新博文' : '立即发布';
    }),

    draftText: Ember.computed('controller.isPublished', function () {
        return this.get('controller.isPublished') ? '取消发布' : '保存草稿';
    }),

    saveText: Ember.computed('controller.willPublish', function () {
        return this.get('controller.willPublish') ? this.get('publishText') : this.get('draftText');
    })
});

export default EditorSaveButtonView;
