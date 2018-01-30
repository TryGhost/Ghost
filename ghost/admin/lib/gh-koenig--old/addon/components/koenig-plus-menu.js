import $ from 'jquery';
import Component from '@ember/component';
import Range from 'mobiledoc-kit/utils/cursor/range';
import Tools from '../options/default-tools';
import layout from '../templates/components/koenig-plus-menu';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';

const ROW_LENGTH = 4;

export default Component.extend({
    layout,
    isOpen: false,
    isButton: false,
    toolsLength: 0,
    selected: -1,
    selectedTool: null,
    query: '',
    range: null,
    editor: null,

    showButton: computed('isOpen', 'isButton', function () {
        return this.get('isOpen') || this.get('isButton');
    }),

    toolbar: computed('query', 'range', 'selected', function () {
        let tools = [];
        let match = (this.query || '').trim().toLowerCase();
        let selected = this.get('selected');
        let i = 0;
        // todo cache active tools so we don't need to loop through them on selection change.
        this.tools.forEach((tool) => {
            if ((tool.type === 'block' || tool.type === 'card') && tool.cardMenu === true && (tool.label.toLowerCase().startsWith(match) || tool.name.toLowerCase().startsWith(match))) {
                let t = {
                    label: tool.label,
                    name: tool.name,
                    icon: tool.icon,
                    onClick: tool.onClick,
                    range: this.get('range'),
                    order: tool.order,
                    selected: false
                };

                tools.push(t);
                i += 1;
            }
        });

        // TODO: this needs to go away because side effects should not be introduced in CPs
        this.set('toolsLength', i); // eslint-disable-line

        tools.sort((a, b) => a.order > b.order);
        if (selected > -1) {
            let selectedTool = tools[selected] || tools[0];
            if (selectedTool) {
                this.set('selectedTool', selectedTool);
                selectedTool.selected = true;
            }
        } else {
            // even if the range is out of bounds (as in the starting state where the selection prompt is not shown)
            // we still need a selected item for the enter key.
            this.set('selectedTool', tools[0]);
        }
        return tools;
    }),

    init() {
        this._super(...arguments);
        this.tools = new Tools(this.get('editor'), this);
    },

    didRender() {
        let editor = this.get('editor');
        let input = this.$('.gh-cardmenu-search-input');
        let $editor = $(this.get('containerSelector'));

        input.blur(() => {
            run.later(() => {
                this.send('closeMenuKeepButton');
            }, 100);
        });

        editor.cursorDidChange(() => {
            if (!editor.range || !editor.range.head.section) {
                return;
            }

            if (!editor.range.head.section.isBlank) {
                this.send('closeMenu');
                return;
            }

            let currentNode = editor.range.head.section.renderNode.element;

            let offset = this.$(currentNode).position();
            let editorOffset = $editor.offset();

            this.set('isButton', true);

            // we store the range for the current paragraph as we can lose it later.
            this.set('range', {
                section: editor.range.head.section,
                startOffset: editor.range.head.offset,
                endOffset: editor.range.head.offset
            });

            run.schedule('afterRender', this,
                () => {
                    let button = this.$('.gh-cardmenu-button');
                    button.css('top', offset.top + $editor.scrollTop() - editorOffset.top - 2);
                });
        });
    },

    actions: {
        openMenu() {
            let button = this.$('.gh-cardmenu-button'); // the ⊕ button.
            let $editor = $(this.get('containerSelector'));
            this.set('isOpen', true);

            this.set('selected', -1);
            this.set('selectedTool', null);

            this.propertyDidChange('toolbar');

            run.schedule('afterRender', this,
                () => {
                    let menu = this.$('.gh-cardmenu');
                    let top = parseInt(button.css('top').replace('px', ''));

                    // calculate the parts of the menu that are hidden by the overflow.
                    let hiddenByOverflow = ($editor.innerHeight() + $editor.scrollTop()) - (menu.height() + top);
                    if (hiddenByOverflow < 0) {
                        top = top + hiddenByOverflow - 30;
                    }

                    menu.css('top', top);
                    menu.css('left', button.css('left') + button.width());
                    menu.hide().fadeIn('fast', () => {
                        this.$('.gh-cardmenu-search-input').focus();
                    });
                });

            let action = this.get('menuIsOpen');
            if (action) {
                action();
            }
        },

        closeMenu() {
            this.set('isButton', false);
            this.$('.gh-cardmenu').fadeOut('fast', () => {
                this.set('isOpen', false);
            });

            let action = this.get('menuIsClosed');
            if (action) {
                action();
            }
        },

        closeMenuKeepButton() {
            this.set('isOpen', false);
        },

        selectTool() {
            let {section} = this.get('range');
            let editor = this.get('editor');
            editor.range = Range.create(section, 0, section, 0);
            this.get('selectedTool').onClick(editor);
            this.send('closeMenuKeepButton');
        },

        moveSelectionLeft() {
            let item = this.get('selected');
            let length = this.get('toolsLength');
            if (item > 0) {
                this.set('selected', item - 1);
            } else {
                this.set('selected', length - 1);
            }
        },

        moveSelectionUp() {
            let item = this.get('selected');
            if (item > ROW_LENGTH) {
                this.set('selected', item - ROW_LENGTH);
            } else {
                this.set('selected', 0);
            }
        },

        moveSelectionRight() {
            let item = this.get('selected');
            let length = this.get('toolsLength');
            if (item < length) {
                this.set('selected', item + 1);
            } else {
                this.set('selected', 0);
            }
        },

        moveSelectionDown() {
            let item = this.get('selected');
            if (item < 0) {
                item = 0;
            }
            let length = this.get('toolsLength');
            if (item + ROW_LENGTH < length) {
                this.set('selected', item + ROW_LENGTH);
            } else {
                this.set('selected', length - 1);
            }
        }
    }
});
