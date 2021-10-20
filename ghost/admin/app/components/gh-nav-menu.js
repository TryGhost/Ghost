import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhNavMenuComponent extends Component {
    @service settings;
    @service ui;

    @tracked firstRender = true;
}
