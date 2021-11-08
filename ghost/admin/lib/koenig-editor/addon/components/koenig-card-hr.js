import Component from '@glimmer/component';

export default class KoenigCardHrComponent extends Component {
    constructor() {
        super(...arguments);
        this.args.registerComponent(this);
    }
}
