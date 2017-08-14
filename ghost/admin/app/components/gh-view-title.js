import Component from 'ember-component';
import {inject as injectService} from '@ember/service';

export default Component.extend({
    ui: injectService(),

    tagName: 'h2',
    classNames: ['view-title']
});
