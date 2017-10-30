import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default Component.extend({
    ui: service(),

    tagName: 'h2',
    classNames: ['view-title']
});
