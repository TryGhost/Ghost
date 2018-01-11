import Component from '@ember/component';
import layout from '../templates/components/koenig-toolbar-button';
import {computed} from '@ember/object';

export default Component.extend({
    layout,
    tagName: 'button',

    attributeBindings: ['title'],
    classNames: ['gh-toolbar-btn'],
    // TODO: what do selected/primary/secondary classes relate to? Some tools
    // have 'primary' added but none of them appear do anything/be used elsewhere
    classNameBindings: [
        'selected',
        'buttonClass',
        'visibilityClass'
    ],

    // exernally set properties
    tool: null,
    editor: null,

    buttonClass: computed('tool.class', function () {
        return `gh-toolbar-btn-${this.get('tool.class')}`;
    }),

    // returns "primary" or null
    visibilityClass: computed('tool.visibility', function () {
        return this.get('tool.visibility');
    }),

    title: computed('tool.label', function () {
        return this.get('tool.label');
    }),

    willRender() {
        // TODO: "selected" doesn't appear to do anything for toolbar items -
        // it's only used within card menus
        this.set('selected', !!this.tool.selected);

        // sets the primary/secondary/
        if (this.tool.visibility) {
            this.set(this.tool.visibility, true);
        }
    },

    click() {
        this.tool.onClick(this.get('editor'));
    }
});
