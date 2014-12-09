import PaginationMixin from 'ghost/mixins/pagination-controller';
import boundOneWay from 'ghost/utils/bound-one-way';

var TagsController = Ember.ArrayController.extend(PaginationMixin, {
    tags: Ember.computed.alias('model'),

    activeTag: null,
    activeTagNameScratch: boundOneWay('activeTag.name'),
    activeTagSlugScratch: boundOneWay('activeTag.slug'),
    activeTagDescriptionScratch: boundOneWay('activeTag.description'),

    // Tag properties that should not be set to the empty string
    requiredTagProperties: ['name', 'slug'],

    init: function (options) {
        options = options || {};
        options.modelType = 'tag';
        this._super(options);
    },

    saveActiveTagProperty: function (propKey, newValue) {
        var activeTag = this.get('activeTag'),
            currentValue = activeTag.get(propKey),
            requiredTagProps = this.get('requiredTagProperties'),
            self = this,
            tagName;

        newValue = newValue.trim();
        // Quit if value is empty for a required property
        if (!newValue && requiredTagProps.contains(propKey)) {
            return;
        }
        // Quit if there was no change
        if (newValue === currentValue) {
            return;
        }

        activeTag.set(propKey, newValue);

        tagName = activeTag.get('name');
        // don't save a new tag until it has a name
        if (!tagName) {
            return;
        }

        activeTag.save().then(function () {
            self.notifications.showSuccess('Saved ' + tagName);
        }).catch(function (error) {
            self.notifications.showAPIError(error);
        });
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

        saveActiveTagName: function (name) {
            this.saveActiveTagProperty('name', name);
        },

        saveActiveTagSlug: function (slug) {
            this.saveActiveTagProperty('slug', slug);
        },

        saveActiveTagDescription: function (description) {
            this.saveActiveTagProperty('description', description);
        }
    }
});

export default TagsController;
