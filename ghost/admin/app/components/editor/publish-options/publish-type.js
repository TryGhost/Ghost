import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class PublishTypeOption extends Component {
    @action
    onChange(event) {
        event.preventDefault();
        this.args.publishOptions.setPublishType(event.target.value);
    }
}
