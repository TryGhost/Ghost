import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),

    'data-test-publishmenu-published': true,

    didInsertElement() {
        this.setSaveType('publish');
    }
});
