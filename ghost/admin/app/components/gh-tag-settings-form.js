import Component from '@ember/component';
import Ember from 'ember';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {or} from '@ember/object/computed';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const {Handlebars} = Ember;

export default Component.extend({
    feature: service(),
    config: service(),
    settings: service(),

    tag: null,
    scratchTag: null,

    // Allowed actions
    setProperty: () => {},

    twitterTitle: or('scratchTag.twitterTitle', 'seoTitle'),
    twitterDescription: or('scratchTag.twitterDescription', 'seoDescription', 'settings.metaDescription', ''),
    twitterImage: or('tag.twitterImage', 'tag.featureImage'),

    facebookTitle: or('scratchTag.ogTitle', 'seoTitle'),
    facebookDescription: or('scratchTag.ogDescription', 'seoDescription', 'settings.metaDescription', ''),
    facebookImage: or('tag.ogImage', 'tag.featureImage'),

    accentColor: computed('tag.accentColor', function () {
        let color = this.get('tag.accentColor');
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }),

    accentColorBackgroundStyle: computed('tag.accentColor', function () {
        let color = this.get('tag.accentColor') || '#ffffff';
        return htmlSafe(`background-color: ${color}`);
    }),

    title: computed('tag.isNew', function () {
        if (this.get('tag.isNew')) {
            return 'New tag';
        } else {
            return 'Tag settings';
        }
    }),

    seoTitle: computed('scratchTag.{name,metaTitle}', function () {
        const settingsTitle = this.get('settings.title') || '';
        const tagName = settingsTitle ? `${this.scratchTag.name} - ${settingsTitle}` : this.scratchTag.name;
        let metaTitle = this.scratchTag.metaTitle || tagName;

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = htmlSafe(`${metaTitle}&hellip;`);
        }

        return metaTitle;
    }),

    seoURL: computed('scratchTag.{canonicalUrl,slug}', function () {
        let blogUrl = this.get('config.blogUrl');
        let seoSlug = this.scratchTag.slug || '';

        let seoURL = this.scratchTag.canonicalUrl || `${blogUrl}/tag/${seoSlug}`;

        // only append a slash to the URL if the slug exists

        if (!seoURL.endsWith('/')) {
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

        setTwitterImage(image) {
            this.setProperty('twitterImage', image);
        },

        clearTwitterImage() {
            this.setProperty('twitterImage', '');
        },

        setOgImage(image) {
            this.setProperty('ogImage', image);
        },

        clearOgImage() {
            this.setProperty('ogImage', '');
        },

        setCoverImage(image) {
            this.setProperty('featureImage', image);
        },

        clearCoverImage() {
            this.setProperty('featureImage', '');
        },

        validateCanonicalUrl() {
            let newUrl = this.get('scratchTag.canonicalUrl');
            let oldUrl = this.get('tag.canonicalUrl');
            let errMessage = '';

            this.get('tag.errors').remove('canonicalUrl');
            this.get('tag.hasValidated').removeObject('canonicalUrl');

            if (newUrl === '') {
                this.setProperty('canonicalUrl', '');
                return;
            }

            if (!newUrl) {
                newUrl = oldUrl;
            }

            try {
                new URL(newUrl);
                this.setProperty('canonicalUrl', '');
                run.schedule('afterRender', this, function () {
                    this.setProperty('canonicalUrl', newUrl);
                });
            } catch (err) {
                errMessage = 'The url should be a valid url';
                this.get('tag.errors').add('canonicalUrl', errMessage);
                this.get('tag.hasValidated').pushObject('canonicalUrl');
            }
        },

        validateAccentColor() {
            let newColor = this.get('accentColor');
            let oldColor = this.get('tag.accentColor');
            let errMessage = '';

            this.get('tag.errors').remove('accentColor');
            this.get('tag.hasValidated').removeObject('accentColor');

            if (newColor === '') {
                this.setProperty('accentColor', '');
                return;
            }

            if (!newColor) {
                newColor = oldColor;
            }

            if (newColor[0] !== '#') {
                newColor = `#${newColor}`;
            }

            if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
                this.setProperty('accentColor', '');
                run.schedule('afterRender', this, function () {
                    this.setProperty('accentColor', newColor);
                });
            } else {
                errMessage = 'The color should be in valid hex format';
                this.get('tag.errors').add('accentColor', errMessage);
                this.get('tag.hasValidated').pushObject('accentColor');
            }
        }
    }
});
