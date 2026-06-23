import Component from '@glimmer/component';
import ResetGiftLinkModal from './reset-gift-link';
import {action} from '@ember/object';
import {giftLinkUrl} from 'ghost-admin/utils/gift-link';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {trackEvent} from 'ghost-admin/utils/analytics';
import {tracked} from '@glimmer/tracking';

// Shared gift-link modal opened from the post-settings sidebar and the posts-list
// row context menu. It self-manages its API state (ensure-on-open, copy, reset)
// so it can be invoked from anywhere with just a post — no parent wiring needed.
export default class GiftLinkModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service modals;
    @service notifications;

    @inject config;

    @tracked giftLink = null;
    @tracked copied = false;
    @tracked ensuring = false;

    copiedResetTimer = null;

    get post() {
        return this.args.data.post;
    }

    get giftLinkUrl() {
        return giftLinkUrl({
            blogUrl: this.config.blogUrl,
            slug: this.post?.slug,
            token: this.giftLink?.token
        });
    }

    get visitorCount() {
        return this.giftLink ? this.giftLink.redeemed_count : 0;
    }

    get visitorsLabel() {
        const count = this.visitorCount;
        if (count === 0) {
            return 'No visitors yet';
        }
        return `${count} ${count === 1 ? 'visitor' : 'visitors'}`;
    }

    get description() {
        const memberType = this.post?.visibility === 'members' ? 'member' : 'paid member';
        return `Anyone you share this link with will be able to access this post without becoming a ${memberType}.`;
    }

    willDestroy() {
        super.willDestroy(...arguments);
        if (this.copiedResetTimer) {
            clearTimeout(this.copiedResetTimer);
        }
    }

    // Idempotent ensure on open: returns the active link, creating it if absent.
    // We always ensure so the URL and visitor counter populate immediately and
    // the modal is useful without an extra round-trip.
    @action
    async setup() {
        this.ensuring = true;
        try {
            const url = this.ghostPaths.url.api('gift_links', this.post.id);
            const response = await this.ajax.post(url);
            this.giftLink = response.gift_links[0];
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'gift-link.open'});
            this.args.close();
        } finally {
            this.ensuring = false;
        }
    }

    @action
    async copyLink() {
        if (!this.giftLinkUrl) {
            return;
        }
        try {
            await navigator.clipboard.writeText(this.giftLinkUrl);
            trackEvent('gift_link_copied', {surface: 'gift-link-modal'});
            this.copied = true;
            if (this.copiedResetTimer) {
                clearTimeout(this.copiedResetTimer);
            }
            this.copiedResetTimer = setTimeout(() => {
                if (this.isDestroyed || this.isDestroying) {
                    return;
                }
                this.copied = false;
            }, 2000);
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'gift-link.copy'});
        }
    }

    // Open the confirmation modal stacked on top of this one. The gift-link
    // modal stays mounted, so when the reset task updates this.giftLink the
    // new link + zeroed counter show through immediately on confirmation.
    @action
    async startReset() {
        await this.modals.open(ResetGiftLinkModal, {
            confirm: this.confirmResetTask
        });
    }

    @task
    *confirmResetTask(close) {
        try {
            const url = this.ghostPaths.url.api('gift_links', this.post.id, 'reset');
            const response = yield this.ajax.put(url);
            this.giftLink = response.gift_links[0];
            trackEvent('gift_link_reset', {surface: 'gift-link-modal'});
            close(true);
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'gift-link.reset'});
        }
    }
}
