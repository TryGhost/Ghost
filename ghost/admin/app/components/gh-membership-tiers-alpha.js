import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
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

    @inject config;

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

            return true;
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
        this.reloadTiers();
    }

    @action
    async onArchive() {
        this.args.updatePortalPreview();
        this.reloadTiers();
    }

    reloadTiers() {
        // Reload the cached tiers in membersutils
        this.membersUtils.reload();
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
