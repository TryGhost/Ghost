import Component from '@glimmer/component';

export default class MembersListItemColumn extends Component {
    constructor(...args) {
        super(...args);
    }

    get columnName() {
        return this.args.filterColumn.name;
    }

    get columnValue() {
        return this.args.filterColumn?.getValue ? this.args.filterColumn?.getValue(this.args.member) : null;
    }
}
