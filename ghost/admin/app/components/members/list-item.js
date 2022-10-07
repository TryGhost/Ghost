import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class MembersListItem extends Component {
    @service store;

    constructor(...args) {
        super(...args);
    }

    get hasMultipleTiers() {
        return this.store.peekAll('tier')?.length > 1;
    }

    get tiers() {
        const tierData = this.args.member?.tiers || [];
        return tierData.map(tier => tier.name).join(', ');
    }
}
