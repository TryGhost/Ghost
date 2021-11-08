import Component from '@glimmer/component';

export default class KoenigCardPaywallComponent extends Component {
    constructor() {
        super(...arguments);
        this.args.registerComponent(this);
    }
}
