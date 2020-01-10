import Component from '@ember/component';
import Ember from 'ember';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';

const {Handlebars} = Ember;

export default Component.extend({
    feature: service(),
    config: service(),

    tag: null,
    scratchTag: null,

    // Allowed actions
    setProperty: () => {},

    title: computed('tag.isNew', function () {
        if (this.get('tag.isNew')) {
            return 'New tag';
        } else {
            return 'Tag settings';
        }
    }),

    seoTitle: computed('scratchTag.{title,metaTitle}', function () {
        let metaTitle = this.scratchTag.metaTitle || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.scratchTag.title;

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = htmlSafe(`${metaTitle}&hellip;`);
        }

        return metaTitle;
    }),

    seoURL: computed('scratchTag.slug', function () {
        let blogUrl = this.get('config.blogUrl');
        let seoSlug = this.scratchTag.slug || '';

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

    seoDescription: computed('scratchTag.{description,metaDescription}', function () {
        let metaDescription = this.scratchTag.metaDescription || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.scratchTag.description;

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = htmlSafe(`${metaDescription}&hellip;`);
        }

        return metaDescription;
    }),

    actions: {
        setProperty(property, value) {
            this.setProperty(property, value);
        },

        setCoverImage(image) {
            this.setProperty('featureImage', image);
        },

        clearCoverImage() {
            this.setProperty('featureImage', '');
        }
    }
});
