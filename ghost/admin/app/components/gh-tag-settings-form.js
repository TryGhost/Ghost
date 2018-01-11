/* global key */
import Component from '@ember/component';
import Ember from 'ember';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {invokeAction} from 'ember-invoke-action';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

const {Handlebars} = Ember;

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    tag: null,

    isViewingSubview: false,

    scratchName: boundOneWay('tag.name'),
    scratchSlug: boundOneWay('tag.slug'),
    scratchDescription: boundOneWay('tag.description'),
    scratchMetaTitle: boundOneWay('tag.metaTitle'),
    scratchMetaDescription: boundOneWay('tag.metaDescription'),

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
            seoURL = Handlebars.Utils.escapeExpression(seoURL);
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

    didReceiveAttrs() {
        this._super(...arguments);

        let oldTagId = this._oldTagId;
        let newTagId = this.get('tag.id');

        if (newTagId !== oldTagId) {
            this.reset();
        }

        this._oldTagId = newTagId;
    },

    actions: {
        setProperty(property, value) {
            invokeAction(this, 'setProperty', property, value);
        },

        setCoverImage(image) {
            this.send('setProperty', 'featureImage', image);
        },

        clearCoverImage() {
            this.send('setProperty', 'featureImage', '');
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
    }

});
