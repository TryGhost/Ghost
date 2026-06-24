import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {trackEvent} from 'ghost-admin/utils/analytics';

export default class ResetGiftLinkModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service notifications;

    get post() {
        return this.args.data.post;
    }

    @task
    *confirmResetTask(close) {
        try {
            const url = this.ghostPaths.url.api('gift_links', this.post.id, 'reset');
            const response = yield this.ajax.put(url);
            trackEvent('gift_link_reset', {surface: 'gift-link-modal'});
            close({giftLink: response.gift_links[0]});
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'gift-link.reset'});
        }
    }
}
