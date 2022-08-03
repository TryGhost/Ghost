import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class LinkOfferModal extends Component {
    @service config;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get offerUrl() {
        const code = this.args.data.offer?.code || '';
        if (code) {
            const siteUrl = this.config.get('blogUrl');
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
