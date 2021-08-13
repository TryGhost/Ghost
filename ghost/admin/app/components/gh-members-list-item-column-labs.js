import Component from '@glimmer/component';

export default class GhMembersListItemColumnLabs extends Component {
    constructor(...args) {
        super(...args);
    }

    get labels() {
        const labelData = this.args.member.get('labels') || [];
        return labelData.map(label => label.name).join(', ');
    }
}
