import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

export default class SelectRoleModal extends Component {
    @tracked role;

    constructor() {
        super(...arguments);
        this.role = this.args.data.currentRole;
    }
}
