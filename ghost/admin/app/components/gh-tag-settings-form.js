/* global key */
import Component from 'ember-component';
import Ember from 'ember';
import computed, {reads} from 'ember-computed';
import get from 'ember-metal/get';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';

import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {invokeAction} from 'ember-invoke-action';

// ember-cli-shims doesn't export this
const {Handlebars} = Ember;

export default Component.extend({

    tag: null,

    scratchName: boundOneWay('tag.name'),
    scratchSlug: boundOneWay('tag.slug'),
    scratchDescription: boundOneWay('tag.description'),
    scratchMetaTitle: boundOneWay('tag.metaTitle'),
    scratchMetaDescription: boundOneWay('tag.metaDescription'),

    isViewingSubview: false,

    feature: injectService(),
    config: injectService(),
    mediaQueries: injectService(),

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
            metaTitle = htmlSafe(`${metaTitle}&hellip;`);
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
            seoURL = htmlSafe(`${seoURL}&hellip;`);
        }

        return seoURL;
    }),

    seoDescription: computed('scratchDescription', 'scratchMetaDescription', function () {
        let metaDescription = this.get('scratchMetaDescription') || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.get('scratchDescription');

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = htmlSafe(`${metaDescription}&hellip;`);
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
            invokeAction(this, 'setProperty', property, value);
        },

        setCoverImage(image) {
            this.send('setProperty', 'image', image);
        },

        clearCoverImage() {
            this.send('setProperty', 'image', '');
        },

        openMeta() {
            this.set('isViewingSubview', true);
        },

        closeMeta() {
            this.set('isViewingSubview', false);
        },

        deleteTag() {
            invokeAction(this, 'showDeleteTagModal');
        }
    }

});
