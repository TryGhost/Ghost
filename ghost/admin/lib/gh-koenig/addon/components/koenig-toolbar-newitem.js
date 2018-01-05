import $ from 'jquery';
import Component from '@ember/component';
import Tools from '../options/default-tools';
import layout from '../templates/components/koenig-toolbar-newitem';

export default Component.extend({
    layout,
    classNames: ['toolbar-newitem'],

    init() {
        this._super(...arguments);
        let editor = this.get('editor');
        let tools = new Tools(editor, this);
        this.tools = [];

        tools.forEach((item) => {
            if (item.type === 'block' || item.type === 'newline') {
                this.tools.push(item);
            }
        });

        this.iconURL = `${this.get('assetPath')}/tools/`;
    },

    didRender() {
        let $this = this.$();
        let editor = this.get('editor');
        let $editor = $(this.get('containerSelector'));

        if (!editor.range || !editor.range.head.section || !editor.range.head.section.isBlank
            || editor.range.head.section.renderNode._element.tagName.toLowerCase() !== 'p') {
            $this.hide();
        }

        editor.cursorDidChange(() => {
            // if there is no cursor:
            if (!editor.range || !editor.range.head.section || !editor.range.head.section.isBlank
                || editor.range.head.section.renderNode._element.tagName.toLowerCase() !== 'p') {
                $this.hide();
                return;
            }
            let element = editor.range.head.section.renderNode._element;

            if (this._element === element) {
                return;
            }

            this.propertyWillChange('toolbar');

            this.__state = 'normal';
            this.isBlank = true;

            let offset = this.$(element).position();
            let edOffset = $editor.offset();

            $this.css('top', offset.top + $editor.scrollTop() - edOffset.top - 13);
            $this.css('left', offset.left + $editor.scrollLeft() + 20);

            $this.show();

            this._element = element;

            this.tools.forEach((tool) => {
                if (tool.hasOwnProperty('checkElements')) {
                    // if its a list we want to know what type
                    let sectionTagName = editor.activeSection._tagName === 'li' ? editor.activeSection.parent._tagName : editor.activeSection._tagName;
                    tool.checkElements(editor.activeMarkups.concat([{tagName: sectionTagName}]));
                }
            });

            this.propertyDidChange('toolbar');
        });
    }
});
