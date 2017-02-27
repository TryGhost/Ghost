import Ember from 'ember';
import layout from '../templates/components/ghost-toolbar-blockitem';

import Tools from '../options/default-tools';

export default Ember.Component.extend({
    layout,
    classNames: ['toolbar-block'],
    tools: [],
    isBlank: false,
    toolbar: Ember.computed(function () {
        let postTools = [ ];
        let selectedPostTools = [ ];

        this.tools.forEach(tool => {

            if (tool.type === 'block' || (tool.type === 'card' && this.isBlank)) {
                if (tool.selected) {
                    selectedPostTools.push(tool);
                } else {
                    postTools.push(tool);
                }
            }

        });
        return selectedPostTools.concat(postTools);

    }).property('tools.@each.selected'),

    init() {
        this._super(...arguments);
        let editor = this.editor = this.get('editor');
        this.tools = new Tools(editor, this);

        this.iconURL = this.get('assetPath') + '/tools/';
    },
    didRender() {
        let $this = this.$();
        let editor = this.editor;
        let $editor = Ember.$('.gh-editor-container'); // TODO this is part of Ghost-Admin

        editor.cursorDidChange(() => {

            // if there is no cursor:
            if(!editor.range || !editor.range.head.section) {
                $this.fadeOut();
                return;
            }

            let element = editor.range.head.section.renderNode._element;

            if(this._element === element) {
                return;
            }

            // if the section is a blank section then we can change it to a card, otherwise we can't.
            if(editor.range.head.section.isBlank) {
                this.set('isBlank', true);
            } else {
                this.set('isBlank', false);
            }

            this.propertyWillChange('toolbar');

            this.__state = 'normal';

            let offset =  this.$(element).position();
            let edOffset = $editor.offset();

            $this.css('top', offset.top + $editor.scrollTop() - edOffset.top - 5);
            if(element.tagName.toLowerCase()==='li') {
                $this.css('left', this.$(element.parentNode).position().left + $editor.scrollLeft() - 90);
            } else {
                $this.css('left', offset.left + $editor.scrollLeft() - 90);
            }


            $this.fadeIn();

            this._element = element;


            this.tools.forEach(tool => {
                if (tool.hasOwnProperty('checkElements')) {
                    // if its a list we want to know what type
                    let sectionTagName = editor.activeSection._tagName === 'li' ? editor.activeSection.parent._tagName : editor.activeSection._tagName;
                    tool.checkElements(editor.activeMarkups.concat([{tagName: sectionTagName}]));
                }
            });

            this.propertyDidChange('toolbar');

        });
    },
    willDestroy() {
        this.editor.destroy();
    }
});
