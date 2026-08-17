import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhCustomViewTitleComponent extends Component {
    @service customViews;
    @service router;
}
