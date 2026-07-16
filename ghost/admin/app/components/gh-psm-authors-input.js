import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhPsmAuthorsInput extends Component {
    @action
    updateAuthors(newAuthors) {
        this.args.updateAuthors(newAuthors);
    }
}
