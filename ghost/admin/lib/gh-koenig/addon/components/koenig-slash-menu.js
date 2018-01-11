import $ from 'jquery';
import Component from '@ember/component';
import Tools from '../options/default-tools';
import layout from '../templates/components/koenig-slash-menu';
import {computed} from '@ember/object';
import {getPositionFromRange} from '../lib/utils';
import {run} from '@ember/runloop';

const ROW_LENGTH = 4;

export default Component.extend({
    layout,
    isOpen: false,
    toolsLength: 0,
    selected: 0,
    selectedTool: null,
    query: '',
    range: null,
    editor: null,

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

        let selectedTool = tools[selected];
        if (selected > -1) {
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
        let editor = this.get('editor');
        this.set('tools', new Tools(editor, this));
    },

    didRender() {
        let editor = this.get('editor');
        let self = this;

        editor.cursorDidChange(this.cursorChange.bind(this));

        editor.onTextInput({
            name: 'slash_menu',
            text: '/',
            run() {
                self.send('openMenu');
            }
        });
    },

    actions: {
        openMenu() {
            let holder = $(this.get('containerSelector'));
            let editor = this.get('editor');
            let self = this;

            this.set('query', '');
            this.set('isOpen', true);
            this.set('range', {
                section: editor.range.head.section,
                startOffset: editor.range.head.offset,
                endOffset: editor.range.head.offset
            });
            this.set('selected', -1);
            this.set('selectedTool', null);

            editor.registerKeyCommand({
                str: 'LEFT',
                name: 'slash',
                run() {
                    let item = self.get('selected');
                    let length = self.get('toolsLength');
                    if (item > 0) {
                        self.set('selected', item - 1);
                    } else {
                        self.set('selected', length - 1);
                    }
                }
            });

            editor.registerKeyCommand({
                str: 'RIGHT',
                name: 'slash',
                run() {
                    let item = self.get('selected');
                    let length = self.get('toolsLength');
                    if (item < length) {
                        self.set('selected', item + 1);
                    } else {
                        self.set('selected', 1);
                    }
                }
            });

            editor.registerKeyCommand({
                str: 'UP',
                name: 'slash',
                run() {
                    let item = self.get('selected');
                    if (item > ROW_LENGTH) {
                        self.set('selected', item - ROW_LENGTH);
                    } else {
                        self.set('selected', 0);
                    }
                }
            });

            editor.registerKeyCommand({
                str: 'DOWN',
                name: 'slash',
                run() {
                    let item = self.get('selected');
                    if (item < 0) {
                        item = 0;
                    }
                    let length = self.get('toolsLength');
                    if (item + ROW_LENGTH < length) {
                        self.set('selected', item + ROW_LENGTH);
                    } else {
                        self.set('selected', length - 1);
                    }
                }
            });

            editor.registerKeyCommand({
                str: 'ENTER',
                name: 'slash',
                run(postEditor) {
                    let {range} = postEditor;

                    range.head.offset = self.get('range').startOffset - 1;
                    postEditor.deleteRange(range);
                    self.get('selectedTool').onClick(self.get('editor'));
                    self.send('closeMenu');
                }
            });

            editor.registerKeyCommand({
                str: 'ESC',
                name: 'slash',
                run() {
                    self.send('closeMenu');
                }
            });

            let position = getPositionFromRange(editor, holder);
            run.schedule('afterRender', this,
                () => {
                    let menu = this.$('.gh-cardmenu');
                    let top = position.top + 20;
                    let left = position.left + (position.width / 2);
                    // calculate if parts of the menu that are hidden by the overflow.
                    let hiddenByOverflowY = (holder.innerHeight() + holder.scrollTop()) - (menu.height() + top);
                    // if the menu is off the bottom of the screen then place it above the cursor

                    if (hiddenByOverflowY < 0) {
                        menu.css('margin-top', -(menu.outerHeight() + 20));
                    }
                    let hiddenByOverflowX = (holder.innerWidth() + holder.scrollLeft()) - (menu.width() + left);
                    // if the menu is off the bottom of the screen then place it above the cursor
                    if (hiddenByOverflowX < 0) {
                        menu.css('margin-left', -(menu.outerWidth() + 20));
                    }

                    menu.css('top', top);
                    menu.css('left', left);
                    menu.hide().fadeIn('fast');
                });

            let action = this.get('menuIsOpen');
            if (action) {
                action();
            }
        },

        closeMenu() {
            let editor = this.get('editor');
            // this.get('editor').unregisterKeyCommand('slash'); -- waiting for the next release for this

            for (let i = editor._keyCommands.length - 1; i > -1; i -= 1) {
                let keyCommand = editor._keyCommands[i];
                if (keyCommand.name === 'slash') {
                    editor._keyCommands.splice(i, 1);
                }
            }

            this.$('.gh-cardmenu').fadeOut('fast', () => {
                this.set('isOpen', false);
            });

            let action = this.get('menuIsClosed');
            if (action) {
                action();
            }
        },

        clickedMenu() {
            let editor = this.get('editor');
            // let{section, startOffset, endOffset} = this.get('range');
            editor.range.head.offset = this.get('range').startOffset - 1;
            editor.deleteRange(editor.range);
            this.send('closeMenu');
        }
    },

    cursorChange() {
        let editor = this.get('editor');
        let range = this.get('range');
        let isOpen = this.get('isOpen');

        // if the cursor isn't in the editor then close the menu
        if (!range || !editor.range.isCollapsed || editor.range.head.section !== range.section || this.editor.range.head.offset < 1 || !this.editor.range.head.section) {
            // unless we click on a tool because the tool will close the menu.
            if (isOpen && !$(window.getSelection().anchorNode).parents('.gh-cardmenu').length) {
                this.send('closeMenu');
            }
            return;
        }

        if (isOpen) {
            let queryString = editor.range.head.section.text.substring(range.startOffset, editor.range.head.offset);
            this.set('query', queryString);
            // if we've typed 5 characters and have no tools then close.
            if (queryString.length > 5 && !this.get('toolLength')) {
                this.send('closeMenu');
            }
        }
    }
});
