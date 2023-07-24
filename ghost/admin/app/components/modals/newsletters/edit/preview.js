import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import moment from 'moment-timezone';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';

export default class EditNewsletterPreview extends Component {
    @service ghostPaths;
    @service session;
    @service settings;
    @service membersUtils;

    get showHeader() {
        return (this.args.newsletter.showHeaderIcon && this.settings.icon)
            || this.headerTitle;
    }

    get showHeaderTitle() {
        return this.headerTitle || this.headerSubtitle;
    }

    get showCommentCta() {
        return this.args.newsletter.showCommentCta && this.settings.commentsEnabled !== 'off';
    }

    get headerTitle() {
        if (this.args.newsletter.showHeaderTitle) {
            return this.settings.title;
        } else if (this.args.newsletter.showHeaderName) {
            return this.args.newsletter.name;
        }

        return null;
    }

    get headerSubtitle() {
        if (this.args.newsletter.showHeaderTitle && this.args.newsletter.showHeaderName) {
            return this.args.newsletter.name;
        }

        return null;
    }

    get featureImageUrl() {
        // keep path separate so asset rewriting correctly picks it up
        const imagePath = '/img/user-cover.png';
        const fullPath = (config.cdnUrl ? '' : this.ghostPaths.assetRoot.replace(/\/$/, '')) + imagePath;
        return fullPath;
    }

    get featureImageStyle() {
        return htmlSafe(`background-image: url(${this.featureImageUrl})`);
    }

    get renewDateString() {
        return moment().add(1, 'year').format('DD MMM YYYY');
    }

    get todayString() {
        return moment().format('DD MMM YYYY');
    }
}
