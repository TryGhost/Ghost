import Component from 'ember-component';
import layout from '../templates/components/koenig-menu-item';
import Range from 'mobiledoc-kit/utils/cursor/range';

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

        this.sendAction('clicked');
        this.get('tool').onClick(editor, section);
    }
});
