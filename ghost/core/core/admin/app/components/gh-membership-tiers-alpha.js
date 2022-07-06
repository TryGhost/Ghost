import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const TYPES = [{
    name: 'Active',
    value: 'active'
},{
    name: 'Archived',
    value: 'archived'
}];

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service config;

    @tracked showTierModal = false;
    @tracked tierModel = null;
    @tracked type = 'active';

    get tiers() {
        return this.args.tiers.filter((tier) => {
            if (this.type === 'active') {
                return !!tier.active;
            } else if (this.type === 'archived') {
                return !tier.active;
            }
        });
    }

    get availableTypes() {
        return TYPES;
    }

    get selectedType() {
        return this.type ? TYPES.find((d) => {
            return this.type === d.value;
        }) : TYPES[0];
    }

    get isEmptyList() {
        return this.tiers.length === 0;
    }

    @action
    onTypeChange(type) {
        this.type = type.value;
    }

    @action
    async openEditTier(tier) {
        this.tierModel = tier;
        this.showTierModal = true;
    }

    @action
    async onUnarchive() {
        this.type = 'active';
        this.args.updatePortalPreview();
    }

    @action
    async onArchive() {
        this.args.updatePortalPreview();
    }

    @action
    async openNewTier() {
        this.tierModel = this.store.createRecord('tier');
        this.showTierModal = true;
    }

    @action
    closeTierModal() {
        this.showTierModal = false;
    }

    @action
    confirmTierSave() {
        this.args.confirmTierSave();
    }
}
