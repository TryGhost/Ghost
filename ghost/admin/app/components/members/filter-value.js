import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class MembersFilterValue extends Component {
    @tracked filterValue;

    constructor(...args) {
        super(...args);
        this.filterValue = this.args.filter.value;
    }

    get tierFilterValue() {
        if (this.args.filter?.type === 'tier') {
            const tiers = this.args.filter?.value || [];
            return tiers.map((tier) => {
                return {
                    slug: tier
                };
            });
        }
        return [];
    }

    get offersFilterValue() {
        if (this.args.filter?.type === 'offer_redemptions') {
            const offers = this.args.filter?.value || [];
            return offers.map((offer) => {
                return {
                    id: offer.id
                };
            });
        }
        return [];
    }

    @action
    setInputFilterValue(filter, event) {
        this.filterValue = event.target.value;
    }

    @action
    updateInputFilterValue(filter, event) {
        if (event.type === 'blur') {
            this.filterValue = event.target.value;
        }
        this.args.setFilterValue(filter, this.filterValue);
    }

    @action
    updateInputFilterValueOnEnter(filter, event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.args.setFilterValue(filter, this.filterValue);
        }
    }

    @action
    setLabelsFilterValue(filter, labels) {
        this.args.setFilterValue(filter, labels.map(label => label.slug));
    }

    @action
    setTiersFilterValue(filter, tiers) {
        this.args.setFilterValue(filter, tiers.map(tier => tier.slug));
    }

    @action
    setOffersFilterValue(filter, offers) {
        console.log(filter);
        this.args.setFilterValue(filter, offers.map(offer => offer.id));
    }

    get isResourceFilter() {
        return !!this.args.filter?.isResourceFilter;
    }

    get resourceFilterType() {
        if (!this.isResourceFilter) {
            return '';
        }

        return this.args.filter?.properties?.resource ?? '';
    }

    get resourceFilterValue() {
        if (!this.isResourceFilter) {
            return {};
        }
        const resource = this.args.filter?.resource || undefined;
        const resourceId = this.args.filter?.value || undefined;
        return resource ?? {
            id: resourceId
        };
    }

    @action
    setResourceFilterValue(filter, resource) {
        this.args.setResourceValue(filter, resource);
    }
}
