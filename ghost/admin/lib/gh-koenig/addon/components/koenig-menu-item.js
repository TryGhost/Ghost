import Component from 'ember-component';
import layout from '../templates/components/koenig-menu-item';

export default Component.extend({
    layout,
    tagName: 'li',

    init() {
        this._super(...arguments);
    },

    actions: {
        select() {
            let {section/* , startOffset, endOffset */} = this.get('range');
            window.getSelection().removeAllRanges();

            let range = document.createRange();

            range.setStart(section.renderNode._element, 0); // startOffset-1); // todo
            range.setEnd(section.renderNode._element, 0); // endOffset-1);

            let selection = window.getSelection();
            selection.addRange(range);

            this.get('tool').onClick(this.get('editor'));
        }
    }
});
