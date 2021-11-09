import Component from '@glimmer/component';

export default class KoenigCardNftComponent extends Component {
    constructor() {
        super(...arguments);
        this.args.registerComponent(this);
    }
}
