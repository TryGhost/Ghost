import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import mobiledocParsers from 'mobiledoc-kit/parsers/mobiledoc';
import {action, computed} from '@ember/object';
import {attributeBindings, classNames} from '@ember-decorators/component';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';

@classic
@classNames('absolute')
@attributeBindings('style', 'data-kg')
export default class KoenigPlusMenu extends Component {
    editor = null;
    editorRange = null;
    snippets = null;

    // internal properties
    showButton = false;
    showMenu = false;
    top = 0;
    'data-kg' = 'plus-menu';

    // private properties
    _onResizeHandler = null;
    _onWindowMousedownHandler = null;
    _lastEditorRange = null;
    _hasCursorButton = false;
    _onMousemoveHandler = null;
    _onKeydownHandler = null;

    // closure actions
    replaceWithCardSection() {}

    @computed('top')
    get style() {
        return htmlSafe(`top: ${this.top}px`);
    }

    init() {
        super.init(...arguments);

        this._onResizeHandler = run.bind(this, this._handleResize);
        window.addEventListener('resize', this._onResizeHandler);

        this._onMousemoveHandler = run.bind(this, this._mousemoveRaf);
        window.addEventListener('mousemove', this._onMousemoveHandler);
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        let editorRange = this.editorRange;

        // show the (+) button when the cursor is on a blank P tag
        if (!this.showMenu && editorRange !== this._lastEditorRange) {
            this._showOrHideButton(editorRange);
            this._hasCursorButton = this.showButton;
        }

        // re-position again on next runloop, prevents incorrect position after
        // adding a card at the bottom of the doc
        if (this.showButton) {
            run.next(this, this._positionMenu);
        }

        // hide the menu if the editor range has changed
        if (!this._ignoreRangeChange && this.showMenu && editorRange && !editorRange.isBlank && !editorRange.isEqual(this._lastEditorRange)) {
            this._hideMenu();
        }

        this._lastEditorRange = editorRange;
        this._ignoreRangeChange = false;
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        run.cancel(this._throttleResize);
        window.removeEventListener('mousedown', this._onWindowMousedownHandler);
        window.removeEventListener('resize', this._onResizeHandler);
        window.removeEventListener('mousemove', this._onMousemoveHandler);
        window.removeEventListener('keydown', this._onKeydownHandler);
    }

    @action
    openMenu() {
        this._showMenu();
    }

    @action
    closeMenu() {
        this._hideMenu();
    }

    @action
    itemClicked(item, event) {
        if (event) {
            event.preventDefault();
        }

        let range = this._editorRange;

        if (item.type === 'card') {
            this.replaceWithCardSection(item.replaceArg, range, item.payload);
        }

        if (item.type === 'snippet') {
            let clickedSnippet = this.snippets.find(snippet => snippet.name === item.label);
            if (clickedSnippet) {
                let post = mobiledocParsers.parse(this.editor.builder, clickedSnippet.mobiledoc);
                this.replaceWithPost(range, post);
            }
        }

        if (item.type === 'selector') {
            this.openSelectorComponent(item.selectorComponent, range);
        }

        this._hideButton();
        this._hideMenu();
    }

    _showOrHideButton(editorRange) {
        if (!editorRange) {
            this._hideButton();
            this._hideMenu();
            return;
        }

        let {head: {section}} = editorRange;

        // show the button if the range is a blank paragraph
        if (editorRange && editorRange.isCollapsed && section && !section.isListItem && (section.isBlank || section.text === '')) {
            this._editorRange = editorRange;
            this._showButton();
            this._hideMenu();
        } else {
            this._hideButton();
            this._hideMenu();
        }
    }

    _showButton() {
        this._positionMenu();
        this.set('showButton', true);
    }

    _hideButton() {
        this.set('showButton', false);
    }

    // find the "top" position by grabbing the current sections
    // render node and querying it's bounding rect. Setting "top"
    // positions the button+menu container element [data-kg="plus-menu"]
    _positionMenu() {
        // use the cached range if available because `editorRange` may have been
        // lost due to clicks on the open menu
        let {head: {section}} = this._editorRange || this.editorRange;

        if (section) {
            let containerRect = this.element.parentNode.getBoundingClientRect();
            let selectedElement = section.renderNode.element;
            if (selectedElement) {
                let selectedElementRect = selectedElement.getBoundingClientRect();
                let top = selectedElementRect.top - containerRect.top;

                this.set('top', top);
            }
        }
    }

    _showMenu() {
        this.set('showMenu', true);

        // move the cursor to the blank paragraph, ensures any selected card
        // gets inserted in the correct place because editorRange will be
        // wherever the cursor currently is if the menu was opened via a
        // mouseover button
        this._moveCaretToCachedEditorRange();

        // focus the search immediately so that you can filter immediately
        run.schedule('afterRender', this, function () {
            this._focusSearch();
        });

        // watch the window for mousedown events so that we can close the menu
        // when we detect a click outside
        this._onWindowMousedownHandler = run.bind(this, this._handleWindowMousedown);
        window.addEventListener('mousedown', this._onWindowMousedownHandler);

        // watch for keydown events so that we can close the menu on Escape
        this._onKeydownHandler = run.bind(this, this._handleKeydown);
        window.addEventListener('keydown', this._onKeydownHandler);
    }

    _hideMenu() {
        if (this.showMenu) {
            // reset our cached editorRange
            this._editorRange = null;

            // stop watching the body for clicks and keydown
            window.removeEventListener('mousedown', this._onWindowMousedownHandler);
            window.removeEventListener('keydown', this._onKeydownHandler);

            // hide the menu
            this.set('showMenu', false);
        }
    }

    _focusSearch() {
        let search = this.element.querySelector('input');
        if (search) {
            search.focus();
        }
    }

    _handleWindowMousedown(event) {
        if (
            !event.target.closest(`#${this.elementId}, .fullscreen-modal-container`)
        ) {
            this._hideMenu();
        }
    }

    _mousemoveRaf(event) {
        if (!this._mousemoveTicking) {
            requestAnimationFrame(run.bind(this, this._handleMousemove, event));
        }
        this._mousemoveTicking = true;
    }

    // show the (+) button when the mouse is over a blank P tag
    _handleMousemove(event) {
        if (!this.showMenu && this.element) {
            let {pageX, pageY} = event;
            let editor = this.editor;

            // add a horizontal buffer to the pointer position so that the
            // (+) button doesn't disappear when the mouse hovers over it due
            // to it being outside of the editor canvas
            let containerRect = this.element.parentNode.getBoundingClientRect();
            if (pageX < containerRect.left) {
                pageX = pageX + 40;
            }

            // grab a range from the editor position under the pointer. We can
            // rely on the same show/hide behaviour of our cursor implementation
            try {
                let position = editor.positionAtPoint(pageX, pageY);
                if (position) {
                    let pointerRange = position.toRange();
                    this._showOrHideButton(pointerRange);
                }
            } catch (e) {
                // mobiledoc-kit can generate the following harmless error
                // from positionAtPoint(x,y) whilst dragging a selection
                // TypeError: Failed to execute 'compareDocumentPosition' on 'Node': parameter 1 is not of type 'Node'.
                if (e instanceof TypeError === false) {
                    // don't throw because this isn't fatal
                    console.error(e); // eslint-disable-line
                }
            }

            // if the button is hidden due to the pointer not being over a blank
            // P but we have a valid cursor position then fall back to the cursor
            // positioning
            if (!this.showButton && this._hasCursorButton) {
                this._showOrHideButton(this.editorRange);
            }
        }

        this._mousemoveTicking = false;
    }

    _handleKeydown(event) {
        if (event.key === 'Escape') {
            // reset the caret position so we have a caret after closing
            this._moveCaretToCachedEditorRange();
            this._hideMenu();
            return;
        }

        let arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowKeys.includes(event.key)) {
            this._hideMenu();
        }
    }

    _handleResize() {
        if (this.showButton) {
            this._throttleResize = run.throttle(this, this._positionMenu, 100);
        }
    }

    _moveCaretToCachedEditorRange() {
        this._ignoreRangeChange = true;
        this.set('editorRange', this._editorRange);
        this.editor.selectRange(this._editorRange);
    }
}
