import Component from '@ember/component';
import {inject as injectService} from '@ember/service';

export default Component.extend({
    tagName: '',

    config: injectService()
});
