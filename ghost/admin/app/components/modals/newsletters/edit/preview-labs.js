import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import moment from 'moment-timezone';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export default class EditNewsletterPreview extends Component {
    @service ghostPaths;
    @service session;
    @service settings;
    @service membersUtils;

    get accentColor() {
        return this.settings.accentColor;
    }

    get backgroundColor() {
        const value = this.args.newsletter.backgroundColor;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'dark') {
            return '#15212a';
        }

        return '#ffffff';
    }

    get backgroundColorIsDark() {
        return textColorForBackgroundColor(this.backgroundColor).hex().toLowerCase() === '#ffffff';
    }

    get borderColor() {
        const value = this.args.newsletter.borderColor;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'auto') {
            const backgroundColor = this.backgroundColor;
            return textColorForBackgroundColor(backgroundColor).hex();
        }

        if (value === 'accent') {
            return this.accentColor;
        }

        return null;
    }

    get secondaryBorderColor() {
        return textColorForBackgroundColor(this.backgroundColor).alpha(0.12).toString();
    }

    get titleColor() {
        const value = this.args.newsletter.titleColor;

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'accent') {
            return this.accentColor;
        }

        const backgroundColor = this.backgroundColor;
        return textColorForBackgroundColor(backgroundColor).hex();
    }
    get textColor() {
        return textColorForBackgroundColor(this.backgroundColor).hex();
    }
    get secondaryTextColor() {
        return textColorForBackgroundColor(this.backgroundColor).alpha(0.5).toString();
    }
    get linkColor() {
        return this.backgroundIsDark ? '#ffffff' : this.accentColor;
    }

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
