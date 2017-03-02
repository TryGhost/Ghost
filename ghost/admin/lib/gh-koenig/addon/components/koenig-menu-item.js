import Component from 'ember-component';
import layout from '../templates/components/koenig-menu-item';
import Range from 'mobiledoc-kit/utils/cursor/range';

export default Component.extend({
    layout,
    tagName: 'li',

    init() {
        this._super(...arguments);
    },

    actions: {
        select() {
            let {section, startOffset, endOffset} = this.get('range');
            window.getSelection().removeAllRanges();

            let range = document.createRange();

            range.setStart(section.renderNode._element, 0); // startOffset-1); // todo
            range.setEnd(section.renderNode._element, 0); // endOffset-1);

            let selection = window.getSelection();
            selection.addRange(range);

            // TODO: remove console.log
            // eslint-disable-next-line no-console
            console.log(startOffset, endOffset, Range);
            // let editor = this.get('editor');
            // let range = editor.range;
            // console.log(endOffset, startOffset);
            // range = range.extend(endOffset - startOffset);
            // editor.run((postEditor) => {
            //     let position = postEditor.deleteRange(range);
            //     let em = postEditor.builder.createMarkup('em');
            //     let nextPosition = postEditor.insertTextWithMarkup(position, 'BOO', [em]);
            //     postEditor.insertTextWithMarkup(nextPosition, '', []); // insert the un-marked-up space
            // });

            this.get('tool').onClick(this.get('editor'));
        }
    }
});
