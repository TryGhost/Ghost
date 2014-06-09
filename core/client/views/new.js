var NewView = Ember.View.extend({
    tagName: 'section',
    templateName: 'editor',
    classNames: ['entry-container'],
    scrollPosition: 0  // percentage of scroll position
});

export default NewView;
