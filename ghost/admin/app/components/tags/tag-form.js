import Component from '@glimmer/component';
import Ember from 'ember';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {slugify} from '@tryghost/string';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const {Handlebars} = Ember;

export default class TagForm extends Component {
    @service feature;
    @service settings;

    @inject config;

    @tracked metadataOpen = false;
    @tracked twitterMetadataOpen = false;
    @tracked facebookMetadataOpen = false;
    @tracked codeInjectionOpen = false;

    get seoTitle() {
        const settingsTitle = this.settings.title || '';
        const tagName = settingsTitle ? `${this.args.tag.name} - ${settingsTitle}` : this.args.tag.name;
        let metaTitle = this.args.tag.metaTitle || tagName;

        if (metaTitle && metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = htmlSafe(`${metaTitle}&hellip;`);
        }

        return metaTitle;
    }

    get seoDescription() {
        let metaDescription = this.args.tag.metaDescription || '';

        metaDescription = metaDescription.length > 0 ? metaDescription : this.args.tag.description;

        if (metaDescription && metaDescription.length > 156) {
            metaDescription = metaDescription.substring(0, 156).trim();
            metaDescription = Handlebars.Utils.escapeExpression(metaDescription);
            metaDescription = htmlSafe(`${metaDescription}&hellip;`);
        }

        return metaDescription;
    }

    get seoURL() {
        const blogUrl = this.config.blogUrl;
        const seoSlug = this.args.tag.slug || '';

        let seoURL = this.args.tag.canonicalUrl || `${blogUrl}/tag/${seoSlug}`;

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
    }

    get tagURL() {
        const blogUrl = this.config.blogUrl;
        const tagSlug = this.args.tag.slug || '';

        let tagURL = this.args.tag.canonicalUrl || `${blogUrl}/tag/${tagSlug}`;

        // only append a slash to the URL if the slug exists

        if (!tagURL.endsWith('/')) {
            tagURL += '/';
        }

        return tagURL;
    }

    get twitterTitle() {
        return this.args.tag.twitterTitle || this.seoTitle;
    }

    get twitterDescription() {
        return this.args.tag.twitterDescription || this.seoDescription || this.settings.metaDescription || '';
    }

    get twitterImage() {
        return this.args.tag.twitterImage || this.args.tag.featureImage;
    }

    get facebookTitle() {
        return this.args.tag.ogTitle || this.seoTitle;
    }

    get facebookDescription() {
        return this.args.tag.facebookDescription || this.seoDescription || this.settings.metaDescription || '';
    }

    get facebookImage() {
        return this.args.tag.ogImage || this.args.tag.featureImage;
    }

    get accentColor() {
        const color = this.args.tag.accentColor;
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }

    get accentColorPickerValue() {
        return this.args.tag.accentColor || '#ffffff';
    }

    get accentColorBgStyle() {
        return htmlSafe(`background-color: ${this.accentColorPickerValue}`);
    }

    @action
    setTagProperty(property, newValue) {
        const {tag} = this.args;

        if (newValue) {
            newValue = newValue.trim();
        }

        // Generate slug based on name for new tag when empty
        if (property === 'name' && tag.isNew && !this.hasChangedSlug) {
            let slugValue = slugify(newValue);
            if (/^#/.test(newValue)) {
                slugValue = 'hash-' + slugValue;
            }
            tag.slug = slugValue;
        }

        // ensure manual changes of slug don't get reset when changing name
        if (property === 'slug') {
            this.hasChangedSlug = !!newValue;
        }

        tag[property] = newValue;

        // clear validation message when typing
        tag.hasValidated.addObject(property);
    }

    @action
    validateTagProperty(property) {
        return this.args.tag.validate({property});
    }

    @action
    validateCanonicalUrl() {
        const {tag} = this.args;

        let newUrl = tag.canonicalUrl;
        let [oldUrl] = tag.changedAttributes().canonicalUrl;
        let errMessage = '';

        tag.errors.remove('canonicalUrl');
        tag.hasValidated.removeObject('canonicalUrl');

        if (newUrl === '') {
            tag.canonicalUrl = '';
            return;
        }

        if (!newUrl) {
            newUrl = oldUrl;
        }

        try {
            new URL(newUrl);
            tag.canonicalUrl = '';
            run.schedule('afterRender', this, function () {
                tag.canonicalUrl = newUrl;
            });
        } catch (err) {
            errMessage = 'The url should be a valid url';
            tag.errors.add('canonicalUrl', errMessage);
            tag.hasValidated.pushObject('canonicalUrl');
        }
    }

    @action
    async updateAccentColor(event) {
        const {tag} = this.args;

        let newColor = event.target.value;
        const oldColor = tag.accentColor;

        // reset errors and validation
        tag.errors.remove('accentColor');
        tag.hasValidated.removeObject('accentColor');

        if (newColor === '') {
            if (newColor === oldColor) {
                return;
            }

            // clear out the accent color
            tag.accentColor = '';
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

            tag.accentColor = newColor;
        } else {
            tag.errors.add('accentColor', 'The colour should be in valid hex format');
            tag.hasValidated.pushObject('accentColor');
        }
    }

    @task
    *debounceUpdateAccentColorTask(event) {
        yield timeout(10);
        this.updateAccentColor(event);
    }
}
