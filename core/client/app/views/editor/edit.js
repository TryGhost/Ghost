import Ember from 'ember';
import EditorViewMixin from 'ghost/mixins/editor-base-view';

var EditorView = Ember.View.extend(EditorViewMixin, {
    tagName: 'section',
    classNames: ['gh-view']
});

export default EditorView;
