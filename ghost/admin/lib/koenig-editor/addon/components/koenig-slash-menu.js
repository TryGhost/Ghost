import Component from '@ember/component';
import layout from '../templates/components/koenig-slash-menu';
import {computed} from '@ember/object';
import {copy} from '@ember/object/internals';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

const ROW_LENGTH = 4;

const ITEM_MAP = [
    {
        label: 'Markdown',
        icon: 'koenig/markdown',
        matches: ['markdown', 'md'],
        type: 'card',
        replaceArg: 'markdown'
    },
    {
        label: 'Image',
        icon: 'koenig/image',
        matches: ['image', 'img'],
        type: 'card',
        replaceArg: 'image'
    },
    {
        label: 'HTML',
        icon: 'koenig/html',
        matches: ['embed', 'html'],
        type: 'card',
        replaceArg: 'html'
    },
    {
        label: 'Divider',
        icon: 'koenig/divider',
        matches: ['divider', 'horizontal-rule', 'hr'],
        type: 'card',
        replaceArg: 'hr'
    }
];

export default Component.extend({
    layout,

    // public attrs
    classNames: 'absolute',
    attributeBindings: ['style'],
    editor: null,
    editorRange: null,

    // public properties
    showMenu: false,
    top: 0,
    icons: null,

    // private properties
    _openRange: null,
    _query: '',
    _onWindowMousedownHandler: null,

    // closure actions
    replaceWithCardSection() {},

    style: computed('top', function () {
        return htmlSafe(`top: ${this.top}px`);
    }),

    init() {
        this._super(...arguments);
        let editor = this.editor;

        // register `/` text input for positioning & showing the menu
        editor.onTextInput({
            name: 'slash_menu',
            text: '/',
            run: run.bind(this, this._showMenu)
        });
    },

    didReceiveAttrs() {
        this._super(...arguments);
        let editorRange = this.editorRange;

        // re-position the menu and update the query if necessary when the
        // cursor position changes
        if (editorRange !== this._lastEditorRange) {
            this._handleCursorChange(editorRange);
        }

        this._lastEditorRange = editorRange;
    },

    willDestroyElement() {
        this._super(...arguments);
        window.removeEventListener('mousedown', this._onMousedownHandler);
    },

    actions: {
        itemClicked(item) {
            let range = this._openRange.head.section.toRange();

            if (item.type === 'card') {
                this.replaceWithCardSection(item.replaceArg, range);
            }

            this._hideMenu();
        }
    },

    _handleCursorChange(editorRange) {
        // update menu position to match cursor position
        this._positionMenu(editorRange);

        if (this.showMenu && editorRange) {
            let {head: {section}} = editorRange;

            // close the menu if we're on a non-slash section (eg, when / is deleted)
            if (section && section.text && section.text.indexOf('/') !== 0) {
                this._hideMenu();
                return;
            }

            // update the query when the menu is open and cursor is in our open range
            if (section === this._openRange.head.section) {
                let query = section.text.substring(
                    this._openRange.head.offset,
                    editorRange.head.offset
                );
                this._updateQuery(query);
            }
        }
    },

    _updateQuery(query) {
        let matchedItems = ITEM_MAP.filter((item) => {
            // show all items before anything is typed
            if (!query) {
                return true;
            }

            // show icons where there's a match of the begining of one of the
            // "item.matches" strings
            let matches = item.matches.filter(match => match.indexOf(query) === 0);
            return matches.length > 0;
        });

        // we need a copy to avoid modifying the object references
        let items = copy(matchedItems, true);

        if (items.length) {
            set(items[0], 'selected', true);
        }

        this.set('items', items);
    },

    _showMenu() {
        let editorRange = this.editorRange;
        let {head: {section}} = editorRange;

        // only show the menu if the slash is on an otherwise empty paragraph
        if (!this.showMenu && editorRange.isCollapsed && section && !section.isListItem && section.text === '/') {
            this.set('showMenu', true);

            // ensure all items are shown before we have a query filter
            this._updateQuery('');

            // store a ref to the range when the menu was triggered so that we
            // can query text after the slash
            this._openRange = this.editorRange;

            // set up key handlers for selection & closing
            this._registerKeyboardNavHandlers();

            // watch the window for mousedown events so that we can close the
            // menu when we detect a click outside. This is preferable to
            // watching the range because the range will change and remove the
            // menu before click events on the buttons are registered
            this._onWindowMousedownHandler = run.bind(this, (event) => {
                this._handleWindowMousedown(event);
            });
            window.addEventListener('mousedown', this._onWindowMousedownHandler);
        }
    },

    _hideMenu() {
        if (this.showMenu) {
            this.set('showMenu', false);
            this._unregisterKeyboardNavHandlers();
            window.removeEventListener('mousedown', this._onWindowMousedownHandler);
        }
    },

    _handleWindowMousedown(event) {
        // clicks outside the menu should always close
        if (!event.target.closest(`#${this.elementId}`)) {
            this._hideMenu();

        // clicks on the menu but not on a button should be ignored so that the
        // cursor position isn't lost
        } else if (!event.target.closest('.koenig-cardmenu-card')) {
            event.preventDefault();
        }
    },

    _positionMenu(range) {
        if (!range) {
            return;
        }

        let {head: {section}} = range;

        if (section) {
            let containerRect = this.element.parentNode.getBoundingClientRect();
            let selectedElement = section.renderNode.element;
            let selectedElementRect = selectedElement.getBoundingClientRect();
            let top = selectedElementRect.top + selectedElementRect.height - containerRect.top;

            this.set('top', top);
        }
    },

    _registerKeyboardNavHandlers() {
        // ESC = close menu
        // ARROWS = selection
        let editor = this.editor;

        editor.registerKeyCommand({
            str: 'ESC',
            name: 'slash-menu',
            run: run.bind(this, this._hideMenu)
        });

        editor.registerKeyCommand({
            str: 'ENTER',
            name: 'slash-menu',
            run: run.bind(this, this._performAction)
        });

        editor.registerKeyCommand({
            str: 'UP',
            name: 'slash-menu',
            run: run.bind(this, this._moveSelection, 'up')
        });

        editor.registerKeyCommand({
            str: 'DOWN',
            name: 'slash-menu',
            run: run.bind(this, this._moveSelection, 'down')
        });

        editor.registerKeyCommand({
            str: 'LEFT',
            name: 'slash-menu',
            run: run.bind(this, this._moveSelection, 'left')
        });

        editor.registerKeyCommand({
            str: 'RIGHT',
            name: 'slash-menu',
            run: run.bind(this, this._moveSelection, 'right')
        });
    },

    _performAction() {
        let selectedItem = this._getSelectedItem();

        if (selectedItem) {
            this.send('itemClicked', selectedItem);
        }
    },

    _getSelectedItem() {
        let items = this.items;

        if (items.length <= 0) {
            return;
        }

        return items.find(item => item.selected);
    },

    _moveSelection(direction) {
        let items = this.items;
        let selectedItem = this._getSelectedItem();
        let selectedIndex = items.indexOf(selectedItem);
        let lastIndex = items.length - 1;

        if (lastIndex <= 0) {
            return;
        }

        set(selectedItem, 'selected', false);

        if (direction === 'right') {
            selectedIndex += 1;
            if (selectedIndex > lastIndex) {
                selectedIndex = 0;
            }
        } else if (direction === 'left') {
            selectedIndex -= 1;
            if (selectedIndex < 0) {
                selectedIndex = lastIndex;
            }
        } else if (direction === 'up') {
            selectedIndex -= ROW_LENGTH;
            if (selectedIndex < 0) {
                selectedIndex += ROW_LENGTH;
            }
        } else if (direction === 'down') {
            selectedIndex += ROW_LENGTH;
            if (selectedIndex > lastIndex) {
                selectedIndex -= ROW_LENGTH;
            }
        }

        set(items[selectedIndex], 'selected', true);
    },

    _unregisterKeyboardNavHandlers() {
        let editor = this.editor;
        editor.unregisterKeyCommands('slash-menu');
    }
});
