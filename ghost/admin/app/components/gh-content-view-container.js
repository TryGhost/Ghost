import Component from 'ember-component';
import {reads} from 'ember-computed';
import injectService from 'ember-service/inject';

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    mediaQueries: injectService(),
    previewIsHidden: reads('mediaQueries.maxWidth900')
});
