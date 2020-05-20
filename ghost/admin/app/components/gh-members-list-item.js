import Component from '@glimmer/component';
import moment from 'moment';

export default class GhMembersListItemComponent extends Component {
    get memberSince() {
        // member can be a proxy in a sparse array so .get is required
        let createdAt = this.args.member.get('createdAtUTC');
        if (createdAt) {
            return moment(createdAt).from(moment());
        }
        return null;
    }
}
