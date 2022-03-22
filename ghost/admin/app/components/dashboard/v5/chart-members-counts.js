import Component from '@glimmer/component';

export default class ChartMembersCounts extends Component {
    get dataTotalMembers() {
        return '10,000';
    }

    get dataPaidMembers() {
        return '1,500';
    }

    get dataFreeMembers() {
        return '8,500';
    }
}
