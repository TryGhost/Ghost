import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ModalPostPreviewSocialComponent extends Component {
    @service settings;
    @service ghostPaths;

    @inject config;

    @tracked editingFacebookTitle = false;
    @tracked editingFacebookDescription = false;
    @tracked editingTwitterTitle = false;
    @tracked editingTwitterDescription = false;
    @tracked editingMetaTitle = false;
    @tracked editingMetaDescription = false;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    get _fallbackDescription() {
        return this.args.post.customExcerpt ||
            this.serpDescription ||
            this.settings.description;
    }

    @action
    blurElement(event) {
        if (!event.shiftKey) {
            event.preventDefault();
            event.target.blur();
        }
    }

    @action
    triggerFileDialog(name) {
        const input = document.querySelector(`#${name}FileInput input`);
        if (input) {
            input.click();
        }
    }

    // SERP

    get serpTitle() {
        return this.args.post.metaTitle || this.args.post.title || '(Untitled)';
    }

    get serpURL() {
        const urlParts = [];

        if (this.args.post.canonicalUrl) {
            const canonicalUrl = new URL(this.args.post.canonicalUrl);
            urlParts.push(canonicalUrl.host);
            urlParts.push(...canonicalUrl.pathname.split('/').reject(p => !p));
        } else {
            const blogUrl = new URL(this.config.blogUrl);
            urlParts.push(blogUrl.host);
            urlParts.push(...blogUrl.pathname.split('/').reject(p => !p));
            urlParts.push(this.args.post.slug);
        }

        return urlParts.join(' › ');
    }

    get serpDescription() {
        return this.args.post.metaDescription;
    }

    @action
    editMetaTitle() {
        this.editingMetaTitle = true;
    }

    @action
    setMetaTitle(event) {
        const title = event.target.value;
        this.args.post.metaTitle = title.trim();
        this.args.post.save();
        this.editingMetaTitle = false;
    }

    @action
    editMetaDescription() {
        this.editingMetaDescription = true;
    }

    @action
    setMetaDescription(event) {
        const description = event.target.value;
        this.args.post.metaDescription = description.trim();
        this.args.post.save();
        this.editingMetaDescription = false;
    }

    // Facebook

    get facebookTitle() {
        return this.args.post.ogTitle || this.serpTitle;
    }

    get facebookDescription() {
        return this.args.post.ogDescription || this._fallbackDescription;
    }

    get facebookImage() {
        return this.args.post.ogImage || this.args.post.featureImage || this.settings.ogImage || this.settings.coverImage;
    }

    @action
    editFacebookTitle() {
        this.editingFacebookTitle = true;
    }

    @action
    cancelEdit(property, event) {
        event.preventDefault();
        event.target.value = this.args.post[property];
        event.target.blur();
    }

    @action
    setFacebookTitle(event) {
        const title = event.target.value;
        this.args.post.ogTitle = title.trim();
        this.args.post.save();
        this.editingFacebookTitle = false;
    }

    @action
    editFacebookDescription() {
        this.editingFacebookDescription = true;
    }

    @action
    setFacebookDescription() {
        const description = event.target.value;
        this.args.post.ogDescription = description.trim();
        this.args.post.save();
        this.editingFacebookDescription = false;
    }

    @action
    setFacebookImage([image]) {
        this.args.post.ogImage = image.url;
        this.args.post.save();
    }

    @action
    clearFacebookImage() {
        this.args.post.ogImage = null;
        this.args.post.save();
    }

    // Twitter

    get twitterTitle() {
        return this.args.post.twitterTitle || this.serpTitle;
    }

    get twitterDescription() {
        return this.args.post.twitterDescription || this._fallbackDescription;
    }

    get twitterImage() {
        return this.args.post.twitterImage || this.args.post.featureImage || this.settings.twitterImage || this.settings.coverImage;
    }

    @action
    editTwitterTitle() {
        this.editingTwitterTitle = true;
    }

    @action
    setTwitterTitle(event) {
        const title = event.target.value;
        this.args.post.twitterTitle = title.trim();
        this.args.post.save();
        this.editingTwitterTitle = false;
    }

    @action
    editTwitterDescription() {
        this.editingTwitterDescription = true;
    }

    @action
    setTwitterDescription() {
        const description = event.target.value;
        this.args.post.twitterDescription = description.trim();
        this.args.post.save();
        this.editingTwitterDescription = false;
    }

    @action
    setTwitterImage([image]) {
        this.args.post.twitterImage = image.url;
        this.args.post.save();
    }

    @action
    clearTwitterImage() {
        this.args.post.twitterImage = null;
        this.args.post.save();
    }
}
