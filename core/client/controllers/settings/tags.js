import PaginationMixin from 'ghost/mixins/pagination-controller';
import boundOneWay from 'ghost/utils/bound-one-way';

var TagsController = Ember.ArrayController.extend(PaginationMixin, {
    tags: Ember.computed.alias('model'),

    activeTag: null,
    activeTagNameScratch: boundOneWay('activeTag.name'),
    activeTagSlugScratch: boundOneWay('activeTag.slug'),
    activeTagDescriptionScratch: boundOneWay('activeTag.description'),

    init: function (options) {
        options = options || {};
        options.modelType = 'tag';
        this._super(options);
    },

    saveActiveTag: function () {
        var activeTag = this.get('activeTag'),
            name = activeTag.get('name'),
            self = this;

        activeTag.save().then(function () {
            self.notifications.showSuccess('Saved ' + name);
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
            var activeTag = this.get('activeTag'),
                currentName = activeTag.get('name');

            name = name.trim();
            if (!name || name === currentName) {
                return;
            }

            // setting all of the properties as they are not saved until name is present
            activeTag.setProperties({
                name: name,
                slug: this.get('activeTagSlugScratch').trim(),
                description: this.get('activeTagDescriptionScratch').trim()
            });
            this.saveActiveTag();
        },

        saveActiveTagSlug: function (slug) {
            var name = this.get('activeTag.name'),
                currentSlug = this.get('activeTag.slug') || '';

            slug = slug.trim();
            if (!name || !slug || slug === currentSlug) {
                return;
            }

            this.set('activeTag.slug', slug);
            this.saveActiveTag();
        },

        saveActiveTagDescription: function (description) {
            var name = this.get('activeTag.name'),
                currentDescription = this.get('activeTag.description') || '';

            description = description.trim();
            if (!name || description === currentDescription) {
                return;
            }

            this.set('activeTag.description', description);
            this.saveActiveTag();
        }
    }
});

export default TagsController;
