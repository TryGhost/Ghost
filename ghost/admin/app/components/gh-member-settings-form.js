import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service feature;
    @service settings;

    constructor(...args) {
        super(...args);
        this.member = this.args.member;
        this.scratchMember = this.args.scratchMember;
    }

    @tracked showMemberTierModal = false;
    @tracked tiersList;
    @tracked newslettersList;

    get isAddComplimentaryAllowed() {
        if (!this.membersUtils.paidMembersEnabled) {
            return false;
        }

        if (this.member.get('isNew')) {
            return false;
        }

        if (this.member.get('tiers')?.length > 0) {
            return false;
        }

        // complimentary subscriptions are assigned to tiers so it only
        // makes sense to show the "add complimentary" buttons when there's a
        // tier to assign the complimentary subscription to
        const hasAnActivePaidTier = !!this.tiersList?.length;

        return hasAnActivePaidTier;
    }

    get hasSingleNewsletter() {
        return this.newslettersList?.length === 1;
    }

    get hasMultipleNewsletters() {
        return !!(this.newslettersList?.length > 1);
    }

    get isCreatingComplimentary() {
        return this.args.isSaveRunning;
    }

    get tiers() {
        let subscriptions = this.member.get('subscriptions') || [];

        // Create the tiers from `subscriptions.price.tier`
        let tiers = subscriptions
            .map(subscription => (subscription.tier || subscription.price.tier))
            .filter((value, index, self) => {
                // Deduplicate by taking the first object by `id`
                return typeof value.id !== 'undefined' && self.findIndex(element => (element.tier_id || element.id) === (value.tier_id || value.id)) === index;
            });

        let subscriptionData = subscriptions.filter((sub) => {
            return !!sub.price;
        }).map((sub) => {
            return {
                ...sub,
                startDate: sub.start_date ? moment(sub.start_date).format('D MMM YYYY') : '-',
                validUntil: sub.current_period_end ? moment(sub.current_period_end).format('D MMM YYYY') : '-',
                cancellationReason: sub.cancellation_reason,
                price: {
                    ...sub.price,
                    currencySymbol: getSymbol(sub.price.currency),
                    nonDecimalAmount: getNonDecimal(sub.price.amount)
                },
                isComplimentary: !sub.id
            };
        });
        return tiers.map((tier) => {
            let tierSubscriptions = subscriptionData.filter((subscription) => {
                return subscription?.price?.tier?.tier_id === (tier.tier_id || tier.id);
            });
            return {
                ...tier,
                subscriptions: tierSubscriptions
            };
        });
    }

    get customer() {
        let firstSubscription = this.member.get('subscriptions').firstObject;
        let customer = firstSubscription?.customer;

        if (customer) {
            return {
                ...customer,
                startDate: firstSubscription?.startDate
            };
        }
        return null;
    }

    @action
    updateNewsletterPreference(event) {
        if (!event.target.checked) {
            this.member.set('newsletters', []);
        } else if (this.newslettersList.firstObject) {
            const newsletter = this.newslettersList.firstObject;
            this.member.set('newsletters', [newsletter]);
        }
    }

    @action
    setup() {
        this.fetchTiers.perform();
        this.fetchNewsletters.perform();
    }

    @action
    setProperty(property, value) {
        this.args.setProperty(property, value);
    }

    @action
    setLabels(labels) {
        this.member.set('labels', labels);
    }

    @action
    setMemberNewsletters(newsletters) {
        this.member.set('newsletters', newsletters);
    }

    @action
    closeMemberTierModal() {
        this.showMemberTierModal = false;
    }

    @action
    cancelSubscription(subscriptionId) {
        this.cancelSubscriptionTask.perform(subscriptionId);
    }

    @action
    removeComplimentary(tierId) {
        this.removeComplimentaryTask.perform(tierId);
    }

    @action
    continueSubscription(subscriptionId) {
        this.continueSubscriptionTask.perform(subscriptionId);
    }

    @task({drop: true})
    *cancelSubscriptionTask(subscriptionId) {
        let url = this.ghostPaths.url.api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: true
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *removeComplimentaryTask(tierId) {
        let url = this.ghostPaths.url.api(`members/${this.member.get('id')}`);
        let tiers = this.member.get('tiers') || [];

        const updatedTiers = tiers
            .filter(tier => tier.id !== tierId)
            .map(tier => ({id: tier.id}));

        let response = yield this.ajax.put(url, {
            data: {
                members: [{
                    id: this.member.get('id'),
                    email: this.member.get('email'),
                    tiers: updatedTiers
                }]
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *continueSubscriptionTask(subscriptionId) {
        let url = this.ghostPaths.url.api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: false
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *fetchTiers() {
        this.tiersList = yield this.store.query('tier', {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price'});
    }

    @task({drop: true})
    *fetchNewsletters() {
        this.newslettersList = yield this.store.query('newsletter', {filter: 'status:active'});
        if (this.member.get('isNew')) {
            const defaultNewsletters = this.newslettersList.filter((newsletter) => {
                return newsletter.subscribeOnSignup && newsletter.visibility === 'members';
            });
            this.setMemberNewsletters(defaultNewsletters);
        }
    }
}
