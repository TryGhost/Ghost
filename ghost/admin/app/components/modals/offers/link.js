import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {inject} from 'ghost-admin/decorators/inject';
import {task, timeout} from 'ember-concurrency';

export default class LinkOfferModal extends Component {
    @inject config;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get offerUrl() {
        const code = this.args.data.offer?.code || '';
        if (code) {
            const siteUrl = this.config.blogUrl;
            return `${siteUrl}/${code}`;
        }
        return '';
    }

    @task({drop: true})
    *copyOfferUrl() {
        copyTextToClipboard(this.offerUrl);
        yield timeout(this.isTesting ? 50 : 500);
        return true;
    }
}
