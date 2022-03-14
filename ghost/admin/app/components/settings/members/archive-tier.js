import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ArchiveTierComponent extends Component {
    @service notifications;
    @service router;
    @service modals;

    get isActive() {
        const {product} = this.args;
        return !!product.active;
    }

    get product() {
        return this.args.product;
    }

    @action
    handleArchiveTier() {
        if (!this.product.isNew) {
            this.modals.open('modals/tiers/archive', {
                product: this.product,
                onArchive: this.args.onArchive
            }, {
                className: 'fullscreen-modal fullscreen-modal-action fullscreen-modal-wide'
            });
        }
    }

    @action
    handleUnarchiveTier() {
        if (!this.product.isNew) {
            this.modals.open('modals/tiers/unarchive', {
                product: this.product,
                onUnarchive: this.args.onUnarchive
            }, {
                className: 'fullscreen-modal fullscreen-modal-action fullscreen-modal-wide'
            });
        }
    }
}
