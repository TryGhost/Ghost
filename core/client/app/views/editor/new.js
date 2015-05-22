import Ember from 'ember';
import EditorViewMixin from 'ghost/mixins/editor-base-view';

var EditorNewView = Ember.View.extend(EditorViewMixin, {
    tagName: 'section',
    templateName: 'editor/edit',
    classNames: ['gh-view']
});

export default EditorNewView;
