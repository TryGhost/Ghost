import Component from '@glimmer/component';

export default class MembersActivityTableComponent extends Component {
    activities = (Array.from({length: 50}, () => {
        return {
            member: {
                name: 'Example member'
            },
            event: 'Opened email',
            timestamp: new Date()
        };
    }))

    get showingAll() {
        return !this.args.filter;
    }
}
