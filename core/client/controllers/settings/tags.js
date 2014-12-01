import PaginationMixin from 'ghost/mixins/pagination-controller';

var TagsController = Ember.ArrayController.extend(PaginationMixin, {
    tags: Ember.computed.alias('model'),
    activeTag: null,
    init: function (options) {
        options = options || {};
        options.modelType = 'tag';
        this._super(options);
    },
    actions: {
        // Clear any unsaved changes until autosave is implemented
        closeTagEditor: function () {
            this.get('activeTag').rollback();
            this.send('closeSettingsMenu');
        },
        newTag: function () {
            this.set('activeTag', this.store.createRecord('tag'));
            this.send('openSettingsMenu');
        },
        editTag: function (tag) {
            this.set('activeTag', tag);
            this.send('openSettingsMenu');
        },
        deleteTag: function (tag) {
            var name = tag.get('name'),
                self = this;

            this.send('closeSettingsMenu');

            tag.destroyRecord().then(function () {
                self.notifications.showSuccess('Deleted ' + name);
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });
        },
        saveTag: function (tag) {
            var name = tag.get('name'),
                self = this;

            tag.save().then(function () {
                self.notifications.showSuccess('Saved ' + name);
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });
        }
    }
});

export default TagsController;
