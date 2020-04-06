import Component from '@ember/component';
import layout from '../templates/components/koenig-menu-content';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),

    layout,
    tagName: '',

    itemSections: null,

    itemClicked() {}
});
