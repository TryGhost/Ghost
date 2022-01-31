import Component from '@glimmer/component';
import mobiledocParsers from 'mobiledoc-kit/parsers/mobiledoc';
import snippetIcon from '../utils/snippet-icon';
import {CARD_MENU} from '../options/cards';
import {action} from '@ember/object';
import {isArray} from '@ember/array';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

const Y_OFFSET = 16;

const createItemMatcher = (query) => {
    // match everything before a space to a card. Keeps the relevant
    // card selected when providing attributes to a card, eg:
    // /twitter https://twitter.com/EffinBirds/status/1001765208958881792
    let card = query.split(/\s/)[0].replace(/^\//, '');

    return (item) => {
        // match every item before anything is typed
        if (!query) {
            return true;
        }

        // standard exact matching for items with a matches array
        if (isArray(item.matches)) {
            return card ? item.matches.any(match => match.indexOf(card.toLowerCase()) === 0) : true;
        }

        // custom per-item matching, eg. snippets match any part of their title
        if (typeof item.matches === 'function') {
            return item.matches(query);
        }

        return false;
    };
};

export default class KoenigSlashMenuComponent extends Component {
    @tracked itemSections = [];
    @tracked showMenu = false;
    @tracked selectedRowIndex = 0;
    @tracked selectedColumnIndex = 0;

    query = '';

    constructor() {
        super(...arguments);
        this.registerEditor(null, [this.args.editor]);
    }

    willDestroy() {
        super.willDestroy?.(...arguments);
        window.removeEventListener('mousedown', this._onWindowMousedownHandler);
    }

    // create a 2-dimensional array of items based on the section row length, eg
    // [
    //   [item1, item1, item3]
    //   [item4, item5],
    //   [item6, item7, item8]
    //   [item9]
    // ]
    // - used for arrow key movement of selected item
    get itemMap() {
        let itemMap = [];

        this.itemSections.forEach((section) => {
            let iterations = Math.ceil(section.items.length / section.rowLength);
            for (let i = 0; i < iterations; i++) {
                let startIndex = i * section.rowLength;
                itemMap.push(section.items.slice(startIndex, startIndex + section.rowLength));
            }
        });

        return itemMap;
    }

    get selectedItem() {
        return this.itemMap[this.selectedRowIndex]?.[this.selectedColumnIndex];
    }

    @action
    updateItemSections() {
        let {snippets} = this.args;
        let itemSections = [...CARD_MENU];

        if (snippets?.length) {
            let snippetsSection = {
                title: 'Snippets',
                items: [],
                rowLength: 1
            };

            snippets.forEach((snippet) => {
                let snippetItem = {
                    label: snippet.name,
                    icon: snippetIcon(snippet),
                    type: 'snippet',
                    matches: query => snippet.name.toLowerCase().indexOf(query) > -1
                };
                if (this.args.deleteSnippet) {
                    snippetItem.deleteClicked = (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.args.deleteSnippet(snippet);
                    };
                }
                snippetsSection.items.push(snippetItem);
            });

            itemSections.push(snippetsSection);
        }

        let itemMatcher = createItemMatcher(this.query);

        let matchedItems = itemSections.map((section) => {
            // show icons where there's a match of the begining of one of the
            // "item.matches" strings
            let matches = section.items.filter(itemMatcher);
            if (matches.length > 0) {
                return Object.assign({}, section, {items: matches});
            }
        }).compact();

        if (this.query !== this._lastQuery) {
            this.selectedRowIndex = 0;
            this.selectedColumnIndex = 0;
        }

        // open a selector item type immediately if it's followed by a space
        // to allow instant media searching
        const matchedItem = matchedItems[0]?.items[0];
        if ((matchedItem?.type === 'selector' || matchedItem?.insertOnSpace === true) && this.query.charAt(this.query.length - 1) === ' ') {
            this.itemClicked(matchedItems[0].items[0]);
        }

        this.itemSections = matchedItems;
    }

    @action
    registerContainerElement(element) {
        this.containerElement = element;
    }

    @action
    registerEditor(element, [editor]) {
        // re-register the slash_menu text input handler if the editor changes
        // such as when a "New post" is clicked from the sidebar or a different
        // post is loaded via search
        editor.onTextInput({
            name: 'slash_menu',
            text: '/',
            run: this._showMenu.bind(this)
        });
    }

    @action
    handleCursorChange(element, [editorRange]) {
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
                this.query = section.text.substring(
                    this._openRange.head.offset,
                    editorRange.head.offset
                );
                this._selectedItem = null;
                this.updateItemSections();
            }
        }
    }

    @action
    itemClicked(item, event) {
        if (event) {
            event.preventDefault();
        }

        let range = this._openRange.head.section.toRange();
        let [, ...params] = this.query.split(/\s/);

        // make sure the click doesn't propagate and get picked up by the
        // newly inserted card which can then remove itself because it
        // looks like a click outside of an empty card
        if (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        if (item.type === 'card') {
            let payload = Object.assign({}, item.payload);

            // params are order-dependent and listed in CARD_MENU for each card
            // last param will include all remaining text including spaces
            if (!isEmpty(item.params) && !isEmpty(params)) {
                item.params.forEach((param, i) => {
                    let value = params[i];

                    if (i === item.params.length - 1) {
                        value = params.slice(i).join(' ');
                    }

                    payload[param] = value;
                });
            }

            this.args.replaceWithCardSection(item.replaceArg, range, payload);
        }

        if (item.type === 'snippet') {
            let clickedSnippet = this.args.snippets.find(snippet => snippet.name === item.label);
            if (clickedSnippet) {
                let post = mobiledocParsers.parse(this.args.editor.builder, clickedSnippet.mobiledoc);
                this.args.replaceWithPost(range, post);
            }
        }

        if (item.type === 'selector') {
            this.args.openSelectorComponent(item.selectorComponent);
        }

        this._hideMenu();
    }

    _positionMenu(range) {
        if (!range) {
            return;
        }

        let {head: {section}} = range;

        if (section && section.renderNode.element) {
            let containerRect = this.containerElement.parentNode.getBoundingClientRect();
            let selectedElement = section.renderNode.element;
            let selectedElementRect = selectedElement.getBoundingClientRect();
            let top = selectedElementRect.top + selectedElementRect.height - containerRect.top + Y_OFFSET;

            this.containerElement.style.top = `${top}px`;
        }
    }

    _showMenu() {
        let {editorRange} = this.args;
        let {head: {section}} = editorRange;

        // only show the menu if the slash is on an otherwise empty paragraph
        if (!this.showMenu && editorRange.isCollapsed && section && !section.isListItem && section.text === '/') {
            this.showMenu = true;

            // ensure all items are shown before we have a query filter
            this.query = '';
            // this.set('_selectedItem', null);
            this.updateItemSections();

            // store a ref to the range when the menu was triggered so that we
            // can query text after the slash
            this._openRange = editorRange;

            // set up key handlers for selection & closing
            this._registerEditorKeyboardNavHandlers();

            // watch the window for mousedown events so that we can close the
            // menu when we detect a click outside. This is preferable to
            // watching the range because the range will change and remove the
            // menu before click events on the buttons are registered
            this._onWindowMousedownHandler = run.bind(this, (event) => {
                this._handleWindowMousedown(event);
            });
            window.addEventListener('mousedown', this._onWindowMousedownHandler);
        }
    }

    _hideMenu() {
        if (this.showMenu) {
            this.showMenu = false;
            this._unregisterEditorKeyboardNavHandlers();
            window.removeEventListener('mousedown', this._onWindowMousedownHandler);
        }
    }

    _moveSelection(direction) {
        let {itemMap, selectedRowIndex, selectedColumnIndex} = this;

        if (isEmpty(itemMap)) {
            return;
        }

        let maxSelectedRowIndex = itemMap.length - 1;
        let maxSelectedColumnIndex = itemMap[selectedRowIndex].length - 1;

        if (direction === 'right') {
            selectedColumnIndex += 1;
            if (selectedColumnIndex > maxSelectedColumnIndex) {
                if (selectedRowIndex < maxSelectedRowIndex) {
                    selectedRowIndex += 1;
                } else {
                    selectedRowIndex = 0;
                }
                selectedColumnIndex = 0;
            }
        } else if (direction === 'left') {
            selectedColumnIndex -= 1;
            if (selectedColumnIndex < 0) {
                if (selectedRowIndex > 0) {
                    selectedRowIndex -= 1;
                } else {
                    selectedRowIndex = itemMap.length - 1;
                }
                selectedColumnIndex = itemMap[selectedRowIndex].length - 1;
            }
        } else if (direction === 'up') {
            selectedRowIndex -= 1;
            if (selectedRowIndex < 0) {
                selectedRowIndex = maxSelectedRowIndex;
            }
        } else if (direction === 'down') {
            selectedRowIndex += 1;
            if (selectedRowIndex > maxSelectedRowIndex) {
                selectedRowIndex = 0;
            }
        }

        if (selectedColumnIndex > itemMap[selectedRowIndex].length - 1) {
            selectedColumnIndex = itemMap[selectedRowIndex].length - 1;
        }

        this.selectedRowIndex = selectedRowIndex;
        this.selectedColumnIndex = selectedColumnIndex;
    }

    _performAction() {
        if (this.selectedItem) {
            this.itemClicked(this.selectedItem);
        }
    }

    _handleWindowMousedown(event) {
        // clicks outside the menu should always close
        if (!event.target.closest(`#${this.containerElement.id}, .fullscreen-modal-container`)) {
            this._hideMenu();

        // clicks on the menu but not on a button should be ignored so that the
        // cursor position isn't lost
        } else if (!event.target.closest('[data-kg="cardmenu-card"]')) {
            event.preventDefault();
        }
    }

    _registerEditorKeyboardNavHandlers() {
        // ESC = close menu
        // ARROWS = selection
        let {editor} = this.args;

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
    }

    _unregisterEditorKeyboardNavHandlers() {
        this.args.editor.unregisterKeyCommands('slash-menu');
    }
}
