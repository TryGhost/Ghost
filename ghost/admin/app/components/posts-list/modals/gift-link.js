import Component from '@glimmer/component';
import ResetGiftLinkModal from './reset-gift-link';
import {action} from '@ember/object';
import {giftLinkUrl} from 'ghost-admin/utils/gift-link';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {trackEvent} from 'ghost-admin/utils/analytics';
import {tracked} from '@glimmer/tracking';

// Gift-link modal opened from the posts-list row context menu. It self-manages
// its API state (ensure-on-open, copy, reset) so callers only need a post.
export default class GiftLinkModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service modals;
    @service notifications;

    @inject config;

    @tracked giftLink = null;
    @tracked copied = false;
    @tracked ensuring = false;
    @tracked isReplacing = false;

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
        if (this.args.data.giftLink) {
            this.giftLink = this.args.data.giftLink;
            return;
        }

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

    @action
    async startReset() {
        this.isReplacing = true;

        try {
            const resetModal = this.modals.open(ResetGiftLinkModal, {post: this.post}, {omitBackdrop: true});
            const result = await resetModal;

            if (result?.giftLink) {
                this.giftLink = result.giftLink;
            }

            if (resetModal._deferredOutAnimation) {
                await resetModal._deferredOutAnimation.promise;
            }
        } finally {
            if (!this.isDestroying && !this.isDestroyed) {
                this.isReplacing = false;
            }
        }
    }
}
