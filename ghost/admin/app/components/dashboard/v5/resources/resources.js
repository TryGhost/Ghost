import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class Resources extends Component {
    @tracked loading = null;

    @action
    load() {}
}
