var TagsSettingsMenuView = Ember.View.extend({
    saveText: Ember.computed('controller.model.isNew', function () {
        return this.get('controller.model.isNew') ?
            'Add Tag' :
            'Save Tag';
    })
});

export default TagsSettingsMenuView;
