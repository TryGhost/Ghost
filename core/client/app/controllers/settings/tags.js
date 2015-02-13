import PaginationMixin from 'ghost/mixins/pagination-controller';
import SettingsMenuMixin from 'ghost/mixins/settings-menu-controller';
import boundOneWay from 'ghost/utils/bound-one-way';

var TagsController = Ember.ArrayController.extend(PaginationMixin, SettingsMenuMixin, {
    tags: Ember.computed.alias('model'),

    activeTag: null,
    activeTagNameScratch: boundOneWay('activeTag.name'),
    activeTagSlugScratch: boundOneWay('activeTag.slug'),
    activeTagDescriptionScratch: boundOneWay('activeTag.description'),
    activeTagMetaTitleScratch: boundOneWay('activeTag.meta_title'),
    activeTagMetaDescriptionScratch: boundOneWay('activeTag.meta_description'),

    init: function (options) {
        options = options || {};
        options.modelType = 'tag';
        this._super(options);
    },

    showErrors: function (errors) {
        errors = Ember.isArray(errors) ? errors : [errors];
        this.notifications.showErrors(errors);
    },

    saveActiveTagProperty: function (propKey, newValue) {
        var activeTag = this.get('activeTag'),
            currentValue = activeTag.get(propKey),
            self = this;

        newValue = newValue.trim();

        // Quit if there was no change
        if (newValue === currentValue) {
            return;
        }

        activeTag.set(propKey, newValue);

        this.notifications.closePassive();

        activeTag.save().catch(function (errors) {
            self.showErrors(errors);
        });
    },

    seoTitle: Ember.computed('scratch', 'activeTagNameScratch', 'activeTagMetaTitleScratch', function () {
        var metaTitle = this.get('activeTagMetaTitleScratch') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('activeTagNameScratch');

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Ember.Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = Ember.String.htmlSafe(metaTitle + '&hellip;');
        }

        return metaTitle;
    }),

    seoURL: Ember.computed('activeTagSlugScratch', function () {
        var blogUrl = this.get('config').blogUrl,
            seoSlug = this.get('activeTagSlugScratch') ? this.get('activeTagSlugScratch') : '',
            seoURL = blogUrl + '/tag/' + seoSlug;

        // only append a slash to the URL if the slug exists
        if (seoSlug) {
            seoURL += '/';
        }

        if (seoURL.length > 70) {
            seoURL = seoURL.substring(0, 70).trim();
            seoURL = Ember.String.htmlSafe(seoURL + '&hellip;');
        }

        return seoURL;
    }),

    seoDescription: Ember.computed('scratch', 'activeTagDescriptionScratch', 'activeTagMetaDescriptionScratch', function () {
        var metaDescription = this.get('activeTagMetaDescriptionScratch') || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.get('activeTagDescriptionScratch');

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Ember.Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = Ember.String.htmlSafe(metaDescription + '&hellip;');
        }

        return metaDescription;
    }),

    actions: {
        newTag: function () {
            this.set('activeTag', this.store.createRecord('tag', {post_count: 0}));
            this.send('openSettingsMenu');
        },

        editTag: function (tag) {
            this.set('activeTag', tag);
            this.send('openSettingsMenu');
        },

        saveActiveTagName: function (name) {
            this.saveActiveTagProperty('name', name);
        },

        saveActiveTagSlug: function (slug) {
            this.saveActiveTagProperty('slug', slug);
        },

        saveActiveTagDescription: function (description) {
            this.saveActiveTagProperty('description', description);
        },

        saveActiveTagMetaTitle: function (metaTitle) {
            this.saveActiveTagProperty('meta_title', metaTitle);
        },

        saveActiveTagMetaDescription: function (metaDescription) {
            this.saveActiveTagProperty('meta_description', metaDescription);
        },

        setCoverImage: function (image) {
            this.saveActiveTagProperty('image', image);
        },

        clearCoverImage: function () {
            this.saveActiveTagProperty('image', '');
        }
    }
});

export default TagsController;
