import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';

export default class EditNewsletterPreview extends Component {
    @service config;
    @service ghostPaths;
    @service session;
    @service settings;

    get showHeader() {
        return (this.args.newsletter.showHeaderIcon && this.settings.get('icon'))
            || this.args.newsletter.showHeaderTitle;
    }

    get featureImageUrl() {
        // keep path separate so asset rewriting correctly picks it up
        const imagePath = '/img/user-cover.png';
        const fullPath = this.ghostPaths.assetRoot.replace(/\/$/, '') + imagePath;
        return fullPath;
    }

    get featureImageStyle() {
        return htmlSafe(`background-image: url(${this.featureImageUrl})`);
    }
}
