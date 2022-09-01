import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ArchiveTierComponent extends Component {
    @service notifications;
    @service router;
    @service modals;

    get isActive() {
        const {tier} = this.args;
        return !!tier.active;
    }

    get tier() {
        return this.args.tier;
    }

    @action
    handleArchiveTier() {
        if (!this.tier.isNew) {
            this.modals.open('modals/tiers/archive', {
                tier: this.tier,
                onArchive: this.args.onArchive
            }, {
                className: 'fullscreen-modal fullscreen-modal-action fullscreen-modal-wide'
            });
        }
    }

    @action
    handleUnarchiveTier() {
        if (!this.tier.isNew) {
            this.modals.open('modals/tiers/unarchive', {
                tier: this.tier,
                onUnarchive: this.args.onUnarchive
            }, {
                className: 'fullscreen-modal fullscreen-modal-action fullscreen-modal-wide'
            });
        }
    }
}
