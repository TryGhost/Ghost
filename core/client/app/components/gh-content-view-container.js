import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: ['gh-view', 'content-view-container'],

    mediaQueries: Ember.inject.service(),
    previewIsHidden: Ember.computed.reads('mediaQueries.maxWidth900')
});
