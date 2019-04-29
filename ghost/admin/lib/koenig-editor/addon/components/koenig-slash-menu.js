import Component from '@ember/component';
import layout from '../templates/components/koenig-slash-menu';
import {CARD_MENU} from '../options/cards';
import {assign} from '@ember/polyfills';
import {computed, set} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';

const ROW_LENGTH = 3;

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
    itemSections: null,

    // private properties
    _openRange: null,
    _query: '',
    _onWindowMousedownHandler: null,

    // closure actions
    replaceWithCardSection() {},

    // computed properties
    style: computed('top', function () {
        return htmlSafe(`top: ${this.top}px`);
    }),

    // create a 2-dimensional array of items based on the ROW_LENGTH, eg
    // [
    //   [item1, item1, item3]
    //   [item4, item5],
    //   [item6, item7, item8]
    //   [item9]
    // ]
    // - used for arrow key movement of selected item
    itemMap: computed('itemSections', function () {
        let map = [];

        this.itemSections.forEach((section) => {
            let iterations = Math.ceil(section.items.length / ROW_LENGTH);
            for (let i = 0; i < iterations; i++) {
                let startIndex = i * ROW_LENGTH;
                map.push(section.items.slice(startIndex, startIndex + ROW_LENGTH));
            }
        });

        return map;
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        // re-register the / text input handler if the editor changes such as
        // when a "New post" is clicked from the sidebar or a different post
        // is loaded via search
        if (this.editor !== this._lastEditor) {
            this.editor.onTextInput({
                name: 'slash_menu',
                text: '/',
                run: run.bind(this, this._showMenu)
            });
        }
        this._lastEditor = this.editor;

        // re-position the menu and update the query if necessary when the
        // cursor position changes
        let editorRange = this.editorRange;
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
        itemClicked(item, event) {
            let range = this._openRange.head.section.toRange();
            let [, ...params] = this._query.split(/\s/);
            let payload = assign({}, item.payload);

            // make sure the click doesn't propagate and get picked up by the
            // newly inserted card which can then remove itself because it
            // looks like a click outside of an empty card
            if (event) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }

            // params are order-dependent and listed in CARD_MENU for each card
            if (!isEmpty(item.params) && !isEmpty(params)) {
                item.params.forEach((param, i) => {
                    payload[param] = params[i];
                });
            }

            if (item.type === 'card') {
                this.replaceWithCardSection(item.replaceArg, range, payload);
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
            if (section && (section.text || section.text === '') && section.text.indexOf('/') !== 0) {
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
        this._query = query;

        // match everything before a space to a card. Keeps the relevant
        // card selected when providing attributes to a card, eg:
        // /twitter https://twitter.com/EffinBirds/status/1001765208958881792
        let card = query.split(/\s/)[0].replace(/^\//, '');

        let matchedItems = CARD_MENU.map((section) => {
            // show all items before anything is typed
            if (!card) {
                return section;
            }

            // show icons where there's a match of the begining of one of the
            // "item.matches" strings
            let matches = section.items.filter(item => item.matches.any(match => match.indexOf(card) === 0));
            if (matches.length > 0) {
                return {title: section.title, items: matches};
            }
        }).compact();

        // we need a copy to avoid modifying the object references
        let sections = JSON.parse(JSON.stringify(matchedItems || []));

        if (sections.length) {
            set(sections[0].items[0], 'selected', true);
        }

        this.set('itemSections', sections);
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
        } else if (!event.target.closest('[data-kg="cardmenu-card"]')) {
            event.preventDefault();
        }
    },

    _positionMenu(range) {
        if (!range) {
            return;
        }

        let {head: {section}} = range;

        if (section && section.renderNode.element) {
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
        let sections = this.itemSections;

        if (sections.length <= 0) {
            return;
        }

        for (let section of sections) {
            let item = section.items.find(item => item.selected);
            if (item) {
                return item;
            }
        }
    },

    _moveSelection(direction) {
        let itemMap = this.itemMap;

        if (isEmpty(itemMap)) {
            return;
        }

        let selectedItem = this._getSelectedItem();
        let selectedRow = itemMap.find(row => row.includes(selectedItem));
        let selectedRowIndex = itemMap.indexOf(selectedRow);
        let selectedItemIndex = selectedRow.indexOf(selectedItem);
        let lastRowIndex = itemMap.length - 1;
        let lastItemIndex = selectedRow.length - 1;

        set(selectedItem, 'selected', false);

        if (direction === 'right') {
            selectedItemIndex += 1;
            if (selectedItemIndex > lastItemIndex) {
                if (selectedRowIndex < lastRowIndex) {
                    selectedRowIndex += 1;
                } else {
                    selectedRowIndex = 0;
                }
                selectedItemIndex = 0;
            }
        } else if (direction === 'left') {
            selectedItemIndex -= 1;
            if (selectedItemIndex < 0) {
                if (selectedRowIndex > 0) {
                    selectedRowIndex -= 1;
                } else {
                    selectedRowIndex = itemMap.length - 1;
                }
                selectedItemIndex = itemMap[selectedRowIndex].length - 1;
            }
        } else if (direction === 'up') {
            selectedRowIndex -= 1;
            if (selectedRowIndex < 0) {
                selectedRowIndex = lastRowIndex;
            }
        } else if (direction === 'down') {
            selectedRowIndex += 1;
            if (selectedRowIndex > lastRowIndex) {
                selectedRowIndex = 0;
            }
        }

        if (selectedItemIndex > itemMap[selectedRowIndex].length - 1) {
            selectedItemIndex = itemMap[selectedRowIndex].length - 1;
        }

        set(itemMap[selectedRowIndex][selectedItemIndex], 'selected', true);
    },

    _unregisterKeyboardNavHandlers() {
        let editor = this.editor;
        editor.unregisterKeyCommands('slash-menu');
    }
});
