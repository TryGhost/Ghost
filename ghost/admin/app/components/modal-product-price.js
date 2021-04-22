import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalProductPrice extends ModalBase {
    @tracked model;

    get title() {
        if (this.isExistingPrice) {
            return `Price - ${this.price.nickname || 'No Name'}`;
        }
        return 'New Price';
    }

    get price() {
        return this.model.price || {};
    }

    get isExistingPrice() {
        return !!this.model.price;
    }

    // TODO: rename to confirm() when modals have full Glimmer support
    @action
    confirmAction() {
        this.confirm(this.role);
        this.close();
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    // @action
    // setRoleFromModel() {
    //     this.role = this.model;
    // }

    actions = {
        confirm() {
            this.confirmAction(...arguments);
        },

        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    }
}
