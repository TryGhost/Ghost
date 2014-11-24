import PaginationMixin from 'ghost/mixins/pagination-controller';
import boundOneWay from 'ghost/utils/bound-one-way';

var TagsController = Ember.ArrayController.extend(PaginationMixin, {
    tags: Ember.computed.alias('model'),

    activeTag: null,
    activeTagSlug: boundOneWay('activeTag.slug'),
    activeTagName: boundOneWay('activeTag.name'),
    activeTagDescription: boundOneWay('activeTag.description'),

    init: function (options) {
        options = options || {};
        options.modelType = 'tag';
        this._super(options);
    },

    actions: {
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

        saveActiveTag: function () {
            debugger;
            var activeTag = this.get('activeTag'),
                self = this;

            activeTag.setProperties({
                slug: this.get('activeTagSlug'),
                name: this.get('activeTagName'),
                description: this.get('activeTagDescription')
            });

            // Don't save unless the tag has a name
            if (!(activeTag.get('name'))) {
                return;
            }

            activeTag.save().then(function () {
                self.notifications.showSuccess('Saved ' + name);
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });
        }
    }
});

export default TagsController;
