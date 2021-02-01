import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class ModalPostPreviewSocialComponent extends Component {
    @service config;
    @service settings;

    get _fallbackDescription() {
        return this.args.post.customExcerpt ||
            this.serpDescription ||
            this.settings.get('description');
    }

    // SERP

    get serpTitle() {
        return this.args.post.metaTitle || this.args.post.title || '(Untitled)';
    }

    get serpURL() {
        const blogUrl = this.config.get('blogUrl');
        const seoSlug = this.args.post.slug || '';
        const canonicalUrl = this.args.post.canonicalUrl || '';

        if (canonicalUrl) {
            if (canonicalUrl.match(/^\//)) {
                return `${blogUrl}${canonicalUrl}`;
            } else {
                return canonicalUrl;
            }
        } else {
            const seoURL = `${blogUrl}/${seoSlug}`;

            // only append a slash to the URL if the slug exists
            if (seoSlug) {
                return `${seoURL}/`;
            }

            return seoURL;
        }
    }

    get serpDescription() {
        return this.args.post.metaDescription || this.args.post.excerpt;
    }

    // Facebook

    get facebookTitle() {
        return this.args.post.ogTitle || this.serpTitle;
    }

    get facebookDescription() {
        return this.args.post.ogDescription || this._fallbackDescription;
    }

    get facebookImage() {
        return this.args.post.ogImage;
    }

    // Twitter

    get twitterTitle() {
        return this.args.post.twitterTitle || this.serpTitle;
    }

    get twitterDescription() {
        return this.args.post.twitterDescription || this._fallbackDescription;
    }

    get twitterImage() {
        return this.args.post.twitterImage;
    }
}
