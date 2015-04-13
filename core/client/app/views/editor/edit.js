import Ember from 'ember';
import EditorViewMixin from 'ghost/mixins/editor-base-view';

var EditorView = Ember.View.extend(EditorViewMixin, {
    tagName: 'section',
    classNames: ['entry-container']
});

export default EditorView;
