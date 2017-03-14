import Component from 'ember-component';
import layout from '../templates/components/koenig-toolbar-button';

export default Component.extend({
    layout,
    tagName: 'button',
    classNameBindings: ['selected', 'primary', 'secondary',
        'gh-toolbar-btn-bold', 'gh-toolbar-btn-italic', 'gh-toolbar-btn-strike', 'gh-toolbar-btn-link', 'gh-toolbar-btn-h1', 'gh-toolbar-btn-h2', 'gh-toolbar-btn-quote'],
    classNames: ['gh-toolbar-btn'],
    attributesBindings: ['title'],
    title: 'bold',

    // todo title="Bold", https://github.com/TryGhost/Ghost-Editor/commit/1133a9a7506f409b1b4fae6639c84c94c74dcebf
    // actions: {
    click() {
        this.tool.onClick(this.editor);
    },
    // },
    //
    willRender() {
        this.set(`gh-toolbar-btn-${this.tool.class}`, true);
        if (this.tool.selected) {
            this.set('selected', true);
        } else {
            this.set('selected', false);
        }

        if (this.tool.visibility) {
            this.set(this.tool.visibility, true);
        }

    }
});
