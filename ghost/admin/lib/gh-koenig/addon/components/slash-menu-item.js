import Ember from 'ember';
import layout from '../templates/components/slash-menu-item';
import Range from 'mobiledoc-kit/utils/cursor/range';

export default Ember.Component.extend({
    layout,
    tagName: 'li',
    actions: {
        select: function() {
            let {section, startOffset, endOffset} = this.get('range');
            window.getSelection().removeAllRanges();

            const range = document.createRange();

            range.setStart(section.renderNode._element, 0);//startOffset-1); // todo
            range.setEnd(section.renderNode._element, 0);//endOffset-1);

            const selection = window.getSelection();
            selection.addRange(range);


            console.log(startOffset, endOffset, Range);
            //let editor = this.get('editor');
            //let range = editor.range;
            //console.log(endOffset, startOffset);
            //range = range.extend(endOffset - startOffset);
          //  editor.run(postEditor => {
           //     let position = postEditor.deleteRange(range);
             //   let em = postEditor.builder.createMarkup('em');
                //let nextPosition = postEditor.insertTextWithMarkup(position, 'BOO', [em]);
                //postEditor.insertTextWithMarkup(nextPosition, '', []); // insert the un-marked-up space
            //});



            this.get('tool').onClick(this.get('editor'));
        }
    },
    init() {
        this._super(...arguments);
    }
});
