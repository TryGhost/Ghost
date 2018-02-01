import Component from '@ember/component';
import layout from '../templates/components/koenig-plus-menu';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';

export default Component.extend({
    layout,

    // public attrs
    classNames: 'koenig-plus-menu',
    attributeBindings: ['style'],
    editor: null,
    editorRange: null,

    // internal properties
    showButton: false,
    showMenu: false,
    top: 0,

    // private properties
    _onResizeHandler: null,
    _onWindowMousedownHandler: null,

    style: computed('top', function () {
        return htmlSafe(`top: ${this.get('top')}px`);
    }),

    init() {
        this._super(...arguments);

        this._onResizeHandler = run.bind(this, this._handleResize);
        window.addEventListener('resize', this._onResizeHandler);
    },

    didReceiveAttrs() {
        this._super(...arguments);

        if (!this.get('showMenu')) {
            let editorRange = this.get('editorRange');

            if (!editorRange) {
                this.set('showButton', false);
                this._hideMenu();
                return;
            }

            let {head: {section}} = editorRange;

            // show the button if the cursor is at the beginning of a blank paragraph
            if (editorRange && editorRange.isCollapsed && section && !section.isListItem && (section.isBlank || section.text === '')) {
                this._showButton();
                this._hideMenu();
            } else {
                this.set('showButton', false);
                this._hideMenu();
            }
        }
    },

    willDestroyElement() {
        this._super(...arguments);
        run.cancel(this._throttleResize);
        window.removeEventListener('mousedown', this._onWindowMousedownHandler);
        window.removeEventListener('resize', this.this._onResizeHandler);
    },

    actions: {
        openMenu() {
            this._showMenu();
        },

        closeMenu() {
            this._hideMenu();
        },

        replaceWithCardSection(cardName) {
            let editor = this.get('editor');
            let range = this._editorRange;
            let {head: {section}} = range;

            editor.run((postEditor) => {
                let {builder} = postEditor;
                let card = builder.createCardSection(cardName);
                let needsTrailingParagraph = !section.next;

                postEditor.replaceSection(section, card);

                if (needsTrailingParagraph) {
                    let newSection = postEditor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                    postEditor.setRange(newSection.tailPosition());
                }

                this._hideMenu();
            });
        },

        replaceWithListSection(listType) {
            let editor = this.get('editor');
            let range = this._editorRange;
            let {head: {section}} = range;

            editor.run((postEditor) => {
                let {builder} = postEditor;
                let item = builder.createListItem();
                let listSection = builder.createListSection(listType, [item]);

                postEditor.replaceSection(section, listSection);
                postEditor.setRange(listSection.headPosition());
                this._hideMenu();
            });
        }
    },

    _showButton() {
        this._positionMenu();
        this.set('showButton', true);
    },

    // find the "top" position by grabbing the current sections
    // render node and querying it's bounding rect. Setting "top"
    // positions the button+menu container element .koenig-plus-menu
    _positionMenu() {
        // use the cached range if available because `editorRange` may have been
        // lost due to clicks on the open menu
        let {head: {section}} = this._editorRange || this.get('editorRange');

        if (section) {
            let containerRect = this.element.parentNode.getBoundingClientRect();
            let selectedElement = section.renderNode.element;
            let selectedElementRect = selectedElement.getBoundingClientRect();
            let top = selectedElementRect.top - containerRect.top;

            this.set('top', top);
        }
    },

    _showMenu() {
        this.set('showMenu', true);

        // focus the search immediately so that you can filter immediately
        run.schedule('afterRender', this, function () {
            this._focusSearch();
        });

        // watch the window for mousedown events so that we can close the menu
        // when we detect a click outside
        this._onWindowMousedownHandler = run.bind(this, (event) => {
            this._handleWindowMousedown(event);
        });
        window.addEventListener('mousedown', this._onWindowMousedownHandler);

        // store a reference to our range because it will change underneath
        // us as editor focus is lost
        this._editorRange = this.get('editorRange');
    },

    _hideMenu() {
        if (this.get('showMenu')) {
            // reset our cached editorRange
            this._editorRange = null;

            // stop watching the body for clicks
            window.removeEventListener('mousedown', this._onWindowMousedownHandler);

            // hide the menu
            this.set('showMenu', false);
        }
    },

    _focusSearch() {
        let search = this.element.querySelector('input');
        if (search) {
            search.focus();
        }
    },

    _handleWindowMousedown(event) {
        if (!event.target.closest(`#${this.elementId}`)) {
            this._hideMenu();
        }
    },

    _handleResize() {
        if (this.get('showButton')) {
            this._throttleResize = run.throttle(this, this._positionMenu, 100);
        }
    }

});
