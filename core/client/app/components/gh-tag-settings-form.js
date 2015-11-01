/* global key */
import Ember from 'ember';
import boundOneWay from 'ghost/utils/bound-one-way';

const {get} = Ember;

export default Ember.Component.extend({

    tag: null,

    scratchName: boundOneWay('tag.name'),
    scratchSlug: boundOneWay('tag.slug'),
    scratchDescription: boundOneWay('tag.description'),
    scratchMetaTitle: boundOneWay('tag.meta_title'),
    scratchMetaDescription: boundOneWay('tag.meta_description'),

    isViewingSubview: false,

    config: Ember.inject.service(),

    title: Ember.computed('tag.isNew', function () {
        if (this.get('tag.isNew')) {
            return 'New Tag';
        } else {
            return 'Tag Settings';
        }
    }),

    seoTitle: Ember.computed('scratchName', 'scratchMetaTitle', function () {
        let metaTitle = this.get('scratchMetaTitle') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('scratchName');

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Ember.Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = Ember.String.htmlSafe(metaTitle + '&hellip;');
        }

        return metaTitle;
    }),

    seoURL: Ember.computed('scratchSlug', function () {
        const blogUrl = this.get('config.blogUrl'),
              seoSlug = this.get('scratchSlug') || '';

        let seoURL = blogUrl + '/tag/' + seoSlug;

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

    seoDescription: Ember.computed('scratchDescription', 'scratchMetaDescription', function () {
        let metaDescription = this.get('scratchMetaDescription') || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.get('scratchDescription');

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Ember.Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = Ember.String.htmlSafe(metaDescription + '&hellip;');
        }

        return metaDescription;
    }),

    didReceiveAttrs: function (attrs) {
        if (get(attrs, 'newAttrs.tag.value.id') !== get(attrs, 'oldAttrs.tag.value.id')) {
            this.reset();
        }
    },

    reset: function () {
        this.set('isViewingSubview', false);
        if (this.$()) {
            this.$('.settings-menu-pane').scrollTop(0);
        }
    },

    focusIn: function () {
        key.setScope('tag-settings-form');
    },

    focusOut: function () {
        key.setScope('default');
    },

    actions: {
        setProperty: function (property, value) {
            this.attrs.setProperty(property, value);
        },

        setCoverImage: function (image) {
            this.attrs.setProperty('image', image);
        },

        clearCoverImage: function () {
            this.attrs.setProperty('image', '');
        },

        setUploaderReference: function () {
            // noop
        },

        openMeta: function () {
            this.set('isViewingSubview', true);
        },

        closeMeta: function () {
            this.set('isViewingSubview', false);
        },

        deleteTag: function () {
            this.sendAction('openModal', 'delete-tag', this.get('tag'));
        }
    }

});
