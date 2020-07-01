import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhPostsListItemComponent extends Component {
    @service session;

    get authorNames() {
        return this.args.post.authors.map(author => author.name || author.email).join(', ');
    }
}
