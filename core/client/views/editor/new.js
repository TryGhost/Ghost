var EditorNewView = Ember.View.extend({
    tagName: 'section',
    templateName: 'editor/edit',
    classNames: ['entry-container'],
    scrollPosition: 0  // percentage of scroll position
});

export default EditorNewView;
