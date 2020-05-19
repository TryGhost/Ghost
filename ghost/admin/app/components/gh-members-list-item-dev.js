import Component from '@glimmer/component';
import moment from 'moment';

export default class GhMembersListItemComponent extends Component {
    get memberSince() {
        return moment(this.args.member.createdAtUTC).from(moment());
    }
}
