import ModalComponent from 'ghost-admin/components/modal-base';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ModalMemberTier extends ModalComponent {
    @service store;
    @service ghostPaths;
    @service ajax;

    @tracked price;
    @tracked tier;
    @tracked tiers = [];
    @tracked selectedTier = null;
    @tracked loadingTiers = false;
    @tracked expiryAt = 'forever';
    @tracked customExpiryDate = moment().startOf('day');

    @tracked expiryOptions = [
        {
            label: 'Forever',
            duration: 'forever'
        },
        {
            label: '1 Week',
            duration: 'week'
        },
        {
            label: '1 Month',
            duration: 'month'
        },
        {
            label: '6 Months',
            duration: 'half-year'
        },
        {
            label: '1 Year',
            duration: 'year'
        },
        {
            label: 'Custom',
            duration: 'custom'
        }
    ];

    @task({drop: true})
    *fetchTiers() {
        this.tiers = yield this.store.query('tier', {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price,benefits'});

        this.loadingTiers = false;
        if (this.tiers.length > 0) {
            this.selectedTier = this.tiers.firstObject.id;
        }
    }

    get activeSubscriptions() {
        const subscriptions = this.member.get('subscriptions') || [];
        return subscriptions.filter((sub) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status);
        });
    }

    get member() {
        return this.model;
    }

    get cannotAddPrice() {
        return !this.price || this.price.amount !== 0;
    }

    get minCustomDate() {
        return moment().startOf('day');
    }

    @action
    setup() {
        this.loadingTiers = true;
        this.fetchTiers.perform();
    }

    @action
    setTier(tierId) {
        this.selectedTier = tierId;
    }

    @action
    setPrice(price) {
        this.price = price;
    }

    @action
    confirmAction() {
        return this.addTier.perform();
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    @action
    updateExpiry(expiryDuration) {
        this.expiryAt = expiryDuration;
    }

    @action
    updateCustomExpiryDate(date) {
        this.customExpiryDate = moment(date).startOf('day');
    }

    @task({drop: true})
    *addTier() {
        const url = `${this.ghostPaths.url.api(`members/${this.member.get('id')}`)}?include=tiers`;

        // Cancel existing active subscriptions for member
        for (let i = 0; i < this.activeSubscriptions.length; i++) {
            const subscription = this.activeSubscriptions[i];
            const cancelUrl = this.ghostPaths.url.api(`members/${this.member.get('id')}/subscriptions/${subscription.id}`);
            yield this.ajax.put(cancelUrl, {
                data: {
                    status: 'canceled'
                }
            });
        }

        let expiryAt = null;

        if (this.expiryAt === 'week') {
            expiryAt = moment.utc().add(7, 'days').startOf('day').toISOString();
        } else if (this.expiryAt === 'month') {
            expiryAt = moment.utc().add(1, 'month').startOf('day').toISOString();
        } else if (this.expiryAt === 'half-year') {
            expiryAt = moment.utc().add(6, 'months').startOf('day').toISOString();
        } else if (this.expiryAt === 'year') {
            expiryAt = moment.utc().add(1, 'year').startOf('day').toISOString();
        } else if (this.expiryAt === 'custom') {
            expiryAt = this.customExpiryDate
                .endOf('day')
                .set('milliseconds', 0) // Prevent db rounding up to the next day
                .add(moment().utcOffset(), 'minutes') // Adjust for timezone offset
                .toISOString();
        }
        const tiersData = {
            id: this.selectedTier
        };
        if (expiryAt) {
            tiersData.expiry_at = expiryAt;
        }
        const response = yield this.ajax.put(url, {
            data: {
                members: [{
                    id: this.member.get('id'),
                    email: this.member.get('email'),
                    tiers: [tiersData]
                }]
            }
        });

        this.store.pushPayload('member', response);
        this.closeModal();
        return response;
    }

    actions = {
        confirm() {
            this.confirmAction(...arguments);
        },
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    };
}
