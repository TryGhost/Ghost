import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

export default class PostsRestoreComponent extends Component {
    @tracked localRevisions;

    constructor() {
        super(...arguments);
        this.localRevisions = this.args.model || [];
        console.log('Revisions in component:', this.localRevisions);
    }
}