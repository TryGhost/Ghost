var EditorSaveButtonView = Ember.View.extend({
    templateName: 'editor-save-button',
    tagName: 'section',
    classNames: ['splitbtn', 'js-publish-splitbutton'],

    // Tracks whether we're going to change the state of the post on save
    isDangerous: Ember.computed('controller.model.isPublished', 'controller.willPublish', function () {
        return this.get('controller.model.isPublished') !== this.get('controller.willPublish');
    }),

    publishText: Ember.computed('controller.model.isPublished', 'controller.pageOrPost', function () {
        return this.get('controller.model.isPublished') ? '更新' + this.get('controller.postOrPage') : '立即发布';
    }),

    draftText: Ember.computed('controller.model.isPublished', function () {
        return this.get('controller.model.isPublished') ? '取消发布' : '保存草稿';
    }),

    deleteText: Ember.computed('controller.postOrPage', function () {
        return '删除 ' + this.get('controller.postOrPage');
    }),

    saveText: Ember.computed('controller.willPublish', function () {
        return this.get('controller.willPublish') ? this.get('publishText') : this.get('draftText');
    })
});

export default EditorSaveButtonView;
