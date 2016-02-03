/* global key */
import Ember from 'ember';
import boundOneWay from 'ghost/utils/bound-one-way';

const {
    Component,
    Handlebars,
    computed,
    get,
    inject: {service}
} = Ember;
const {reads} = computed;

export default Component.extend({

    tag: null,

    scratchName: boundOneWay('tag.name'),
    scratchSlug: boundOneWay('tag.slug'),
    scratchDescription: boundOneWay('tag.description'),
    scratchMetaTitle: boundOneWay('tag.metaTitle'),
    scratchMetaDescription: boundOneWay('tag.metaDescription'),

    isViewingSubview: false,

    config: service(),
    mediaQueries: service(),

    isMobile: reads('mediaQueries.maxWidth600'),

    title: computed('tag.isNew', function () {
        if (this.get('tag.isNew')) {
            return 'New Tag';
        } else {
            return 'Tag Settings';
        }
    }),

    seoTitle: computed('scratchName', 'scratchMetaTitle', function () {
        let metaTitle = this.get('scratchMetaTitle') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('scratchName');

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = Ember.String.htmlSafe(`${metaTitle}&hellip;`);
        }

        return metaTitle;
    }),

    seoURL: computed('scratchSlug', function () {
        let blogUrl = this.get('config.blogUrl');
        let seoSlug = this.get('scratchSlug') || '';

        let seoURL = `${blogUrl}/tag/${seoSlug}`;

        // only append a slash to the URL if the slug exists
        if (seoSlug) {
            seoURL += '/';
        }

        if (seoURL.length > 70) {
            seoURL = seoURL.substring(0, 70).trim();
            seoURL = Ember.String.htmlSafe(`${seoURL}&hellip;`);
        }

        return seoURL;
    }),

    seoDescription: computed('scratchDescription', 'scratchMetaDescription', function () {
        let metaDescription = this.get('scratchMetaDescription') || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.get('scratchDescription');

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = Ember.String.htmlSafe(`${metaDescription}&hellip;`);
        }

        return metaDescription;
    }),

    didReceiveAttrs(attrs) {
        this._super(...arguments);

        if (get(attrs, 'newAttrs.tag.value.id') !== get(attrs, 'oldAttrs.tag.value.id')) {
            this.reset();
        }
    },

    reset() {
        this.set('isViewingSubview', false);
        if (this.$()) {
            this.$('.settings-menu-pane').scrollTop(0);
        }
    },

    focusIn() {
        key.setScope('tag-settings-form');
    },

    focusOut() {
        key.setScope('default');
    },

    actions: {
        setProperty(property, value) {
            this.attrs.setProperty(property, value);
        },

        setCoverImage(image) {
            this.attrs.setProperty('image', image);
        },

        clearCoverImage() {
            this.attrs.setProperty('image', '');
        },

        setUploaderReference() {
            // noop
        },

        openMeta() {
            this.set('isViewingSubview', true);
        },

        closeMeta() {
            this.set('isViewingSubview', false);
        },

        deleteTag() {
            this.attrs.showDeleteTagModal();
        }
    }

});
