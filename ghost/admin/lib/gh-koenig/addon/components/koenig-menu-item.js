import Component from '@ember/component';
import Range from 'mobiledoc-kit/utils/cursor/range';
import layout from '../templates/components/koenig-menu-item';

export default Component.extend({
    layout,
    tagName: 'div',
    classNames: ['gh-cardmenu-card'],
    classNameBindings: ['selected'],

    init() {
        this._super(...arguments);
        this.set('selected', this.get('tool').selected);
    },

    click: function () { // eslint-disable-line
        let {section, startOffset, endOffset} = this.get('range');
        let editor = this.get('editor');

        editor.range = Range.create(section, startOffset, section, endOffset);

        let action = this.get('clicked');
        if (action) {
            action();
        }

        this.get('tool').onClick(editor, section);
    }
});
