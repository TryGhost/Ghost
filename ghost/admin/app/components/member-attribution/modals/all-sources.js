import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class FullAttributionTable extends Component {
    @service membersUtils;

    static modalOptions = {
        className: 'epm-modal fullscreen-modal-action fullscreen-modal-wide'
    };
}
