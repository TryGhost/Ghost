import Ember from 'ember';

const {Component, computed, inject} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    mediaQueries: inject.service(),
    previewIsHidden: computed.reads('mediaQueries.maxWidth900')
});
