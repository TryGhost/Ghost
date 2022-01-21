import Component from '@ember/component';
import Ember from 'ember';
import {action, computed} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {or} from '@ember/object/computed';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

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

    accentColorPickerValue: computed('tag.accentColor', function () {
        return this.tag.get('accentColor') || '#ffffff';
    }),

    accentColorBgStyle: computed('accentColorPickerValue', function () {
        return htmlSafe(`background-color: ${this.accentColorPickerValue}`);
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
        }
    },

    updateAccentColor: action(async function (event) {
        let newColor = event.target.value;
        const oldColor = this.tag.get('accentColor');

        // reset errors and validation
        this.tag.errors.remove('accentColor');
        this.tag.hasValidated.removeObject('accentColor');

        if (newColor === '') {
            if (newColor === oldColor) {
                return;
            }

            // clear out the accent color
            this.tag.set('accentColor', '');
            return;
        }

        // accentColor will be null unless the user has input something
        if (!newColor) {
            newColor = oldColor;
        }

        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
            if (newColor === oldColor) {
                return;
            }

            this.tag.set('accentColor', newColor);
            this.scratchTag.set('accentColor', newColor);
        } else {
            this.tag.errors.add('accentColor', 'The colour should be in valid hex format');
            this.tag.hasValidated.pushObject('accentColor');
        }
    }),

    debounceUpdateAccentColor: task(function*(event) {
        yield timeout(10);
        this.updateAccentColor(event);
    })
});
