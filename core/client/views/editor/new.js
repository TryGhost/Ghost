import EditorViewMixin from 'ghost/mixins/editor-base-view';

var EditorNewView = Ember.View.extend(EditorViewMixin, {
    tagName: 'section',
    templateName: 'editor/edit',
    classNames: ['entry-container']
});

export default EditorNewView;
