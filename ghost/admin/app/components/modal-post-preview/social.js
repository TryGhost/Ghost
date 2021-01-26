import Component from '@glimmer/component';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import {inject as service} from '@ember/service';

export default class ModalPostPreviewSocialComponent extends Component {
    @service config;
    @service settings;

    get _fallbackDescription() {
        return this.args.post.customExcerpt ||
            this.serpDescription ||
            this.args.post.excerpt ||
            this.settings.get('description');
    }

    // SERP

    get serpTitle() {
        return this.args.post.metaTitle || this.args.post.title || '(Untitled)';
    }

    get serpDescription() {
        const metaDescription = this.args.post.metaDescription;

        if (metaDescription) {
            return metaDescription;
        }

        const mobiledoc = this.args.post.scratch;
        const [markdownCard] = (mobiledoc && mobiledoc.cards) || [];
        const markdown = markdownCard && markdownCard[1] && markdownCard[1].markdown;

        let serpDescription;

        const div = document.createElement('div');
        div.innerHTML = formatMarkdown(markdown, false);

        // Strip HTML
        serpDescription = div.textContent;
        // Replace new lines and trim
        serpDescription = serpDescription.replace(/\n+/g, ' ').trim();

        return serpDescription;
    }

    // Facebook

    get facebookTitle() {
        return this.args.post.ogTitle || this.serpTitle;
    }

    get facebookDescription() {
        return this.args.post.ogDescription || this._fallbackDescription;
    }

    // Twitter

    get twitterTitle() {
        return this.args.post.twitterTitle || this.serpTitle;
    }

    get twitterDescription() {
        return this.args.post.twitterDescription || this._fallbackDescription;
    }
}
