import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    mediaQueries: service(),
    previewIsHidden: computed.reads('mediaQueries.maxWidth900')
});
