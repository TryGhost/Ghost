import Helper from '@ember/component/helper';
import moment from 'moment-timezone';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';
import {ghPluralize} from 'ghost-admin/helpers/gh-pluralize';
import {inject as service} from '@ember/service';

export default class ParseMemberEventHelper extends Helper {
    @service feature;
    @service utils;
    @service membersUtils;

    compute([event, hasMultipleNewsletters]) {
        const subject = event.data.member.name || event.data.member.email;
        const icon = this.getIcon(event);
        const action = this.getAction(event, hasMultipleNewsletters);
        const info = this.getInfo(event);
        const description = this.getDescription(event);

        const join = this.getJoin(event);
        const object = this.getObject(event);
        const url = this.getURL(event);
        const route = this.getRoute(event);
        const timestamp = moment(event.data.created_at);
        const source = this.getSource(event);

        return {
            memberId: event.data.member_id ?? event.data.member?.id,
            member: event.data.member,
            emailId: event.data.email_id,
            email: event.data.email,
            icon,
            subject,
            action,
            join,
            object,
            source,
            info,
            description,
            url,
            route,
            timestamp
        };
    }

    /* internal helper functions */
    getIcon(event) {
        let icon;

        if (event.type === 'login_event') {
            icon = 'logged-in';
        }

        if (event.type === 'payment_event') {
            icon = 'subscriptions';
        }

        if (event.type === 'newsletter_event') {
            if (event.data.subscribed) {
                icon = 'subscribed-to-email';
            } else {
                icon = 'unsubscribed-from-email';
            }
        }

        if (event.type === 'subscription_event') {
            icon = 'subscriptions';

            if (event.data.type === 'canceled') {
                icon = 'canceled-subscription';
            }
        }

        if (event.type === 'signup_event' || (event.type === 'subscription_event' && event.data.type === 'created' && event.data.signup)) {
            icon = 'signed-up';
        }

        if (event.type === 'email_opened_event') {
            icon = 'opened-email';
        }

        if (event.type === 'email_sent_event') {
            icon = 'sent-email';
        }

        if (event.type === 'email_delivered_event') {
            icon = 'received-email';
        }

        if (event.type === 'email_failed_event') {
            icon = 'email-delivery-failed';
        }

        if (event.type === 'email_complaint_event') {
            icon = 'email-delivery-spam';
        }

        if (event.type === 'comment_event') {
            icon = 'comment';
        }

        if (event.type === 'click_event' || event.type === 'aggregated_click_event') {
            icon = 'click';
        }

        if (event.type === 'feedback_event') {
            if (event.data.score === 1) {
                icon = 'more-like-this';
            } else {
                icon = 'less-like-this';
            }
        }

        return 'event-' + icon;
    }

    getAction(event, hasMultipleNewsletters) {
        if (event.type === 'signup_event' || (event.type === 'subscription_event' && event.data.type === 'created' && event.data.signup)) {
            return 'signed up';
        }

        if (event.type === 'login_event') {
            return 'logged in';
        }

        if (event.type === 'payment_event') {
            return 'made payment';
        }

        if (event.type === 'newsletter_event') {
            let newsletter = 'newsletter';
            if (hasMultipleNewsletters && event.data.newsletter && event.data.newsletter.name) {
                newsletter = event.data.newsletter.name;
            }

            if (event.data.subscribed) {
                return 'subscribed to ' + newsletter;
            } else {
                return 'unsubscribed from ' + newsletter;
            }
        }

        if (event.type === 'subscription_event') {
            if (event.data.type === 'created') {
                return 'started paid subscription';
            }
            if (event.data.type === 'updated') {
                return 'changed paid subscription';
            }
            if (event.data.type === 'canceled') {
                return 'canceled paid subscription';
            }
            if (event.data.type === 'reactivated') {
                return 'reactivated paid subscription';
            }
            if (event.data.type === 'expired') {
                return 'ended paid subscription';
            }

            return 'changed paid subscription';
        }

        if (event.type === 'email_opened_event') {
            return 'opened email';
        }

        if (event.type === 'email_sent_event') {
            return 'sent email';
        }

        if (event.type === 'email_delivered_event') {
            return 'received email';
        }

        if (event.type === 'email_failed_event') {
            return 'bounced email';
        }

        if (event.type === 'email_complaint_event') {
            return 'email flagged as spam';
        }

        if (event.type === 'comment_event') {
            if (event.data.parent) {
                return 'replied to comment';
            }
            return 'commented';
        }

        if (event.type === 'click_event') {
            return 'clicked link in email';
        }

        if (event.type === 'aggregated_click_event') {
            if (event.data.count.clicks <= 1) {
                return 'clicked link in email';
            }
            return `clicked ${ghPluralize(event.data.count.clicks, 'link')} in email`;
        }

        if (event.type === 'feedback_event') {
            if (event.data.score === 1) {
                return 'more like this';
            }
            return 'less like this';
        }
    }

    /**
     * When we need to append the action and object in one sentence, you can add extra words here.
     * E.g.,
     *   action: 'Signed up'.
     *   object: 'My blog post'
     * When both words need to get appended, we'll add 'on'
     *  -> do this by returning 'on' in getJoin()
     * This string is not added when action and object are in a separete table column, or when the getObject/getURL is empty
     */
    getJoin() {
        return '–';
    }

    /**
     * Clickable object, shown between action and info, or in a separate column in some views
     */
    getObject(event) {
        if (event.type === 'signup_event' || event.type === 'subscription_event') {
            if (event.data.attribution?.title) {
                return event.data.attribution.title;
            }
        }

        if (event.type === 'comment_event') {
            if (event.data.post) {
                return event.data.post.title;
            }
        }

        if (event.type === 'click_event' || event.type === 'feedback_event') {
            if (event.data.post) {
                return event.data.post.title;
            }
        }

        return '';
    }

    /**
     * Clickable object, shown between action and info, or in a separate column in some views
     */
    getSource(event) {
        if (event.data?.attribution?.referrer_source) {
            return {
                name: event.data.attribution.referrer_source,
                url: event.data.attribution.referrer_url ?? null
            };
        }

        return null;
    }

    getInfo(event) {
        if (event.type === 'subscription_event') {
            let mrrDelta = getNonDecimal(event.data.mrr_delta, event.data.currency);
            if (mrrDelta === 0) {
                return;
            }
            const symbol = getSymbol(event.data.currency);

            if (event.data.type === 'created') {
                const sign = mrrDelta > 0 ? '' : '-';
                const tierName = this.membersUtils.hasMultipleTiers ? (event.data.tierName ?? 'Paid') : 'Paid';
                return `${tierName} ${sign}${symbol}${Math.abs(mrrDelta)}/month`;
            }
            const sign = mrrDelta > 0 ? '+' : '-';
            return `MRR ${sign}${symbol}${Math.abs(mrrDelta)}`;
        }

        if (event.type === 'signup_event' && this.membersUtils.paidMembersEnabled) {
            return 'Free';
        }

        return;
    }

    getDescription(event) {
        if (event.type === 'click_event') {
            // Clean URL
            try {
                return this.utils.cleanTrackedUrl(event.data.link.to, true);
            } catch (e) {
                // Invalid URL
            }
            return event.data.link.to;
        }
        return;
    }

    /**
     * Make the object clickable
     */
    getURL(event) {
        if (['comment_event', 'click_event', 'feedback_event'].includes(event.type)) {
            if (event.data.post) {
                return event.data.post.url;
            }
        }

        if (['signup_event', 'subscription_event'].includes(event.type)) {
            if (event.data.attribution && event.data.attribution.url) {
                return event.data.attribution.url;
            }
        }
        return;
    }

    /**
     * Get internal route props for a clickable object
     */
    getRoute(event) {
        if (['comment_event', 'click_event', 'feedback_event'].includes(event.type)) {
            if (event.data.post) {
                return {
                    name: 'posts.analytics',
                    model: event.data.post.id
                };
            }
        }

        if (['signup_event', 'subscription_event'].includes(event.type)) {
            if (event.data.attribution_type === 'post') {
                return {
                    name: 'posts.analytics',
                    model: event.data.attribution_id
                };
            }
        }
        return;
    }
}
