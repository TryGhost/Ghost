import Component from '@ember/component';
import layout from '../templates/components/koenig-plus-menu';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';

// clicking on anything in the menu will change the selection because the click
// event propagates, this then closes the menu

// focusing the search input removes the selection in the editor, again closing
// the menu

// when the menu is open we want to:
// - close if clicked outside the menu
// - keep the selected range around in case it gets changed

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

    style: computed('top', function () {
        return htmlSafe(`top: ${this.get('top')}px`);
    }),

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
                // find the "top" position by grabbing the current sections
                // render node and querying it's bounding rect. Setting "top"
                // positions the button+menu container element .koenig-plus-menu
                let containerRect = this.element.parentNode.getBoundingClientRect();
                let selectedElement = editorRange.head.section.renderNode.element;
                let selectedElementRect = selectedElement.getBoundingClientRect();
                let top = selectedElementRect.top - containerRect.top;

                this.set('top', top);
                this.set('showButton', true);
                this._hideMenu();
            } else {
                this.set('showButton', false);
                this._hideMenu();
            }
        }
    },

    willDestroyElement() {
        this._super(...arguments);
        window.removeEventListener('mousedown', this._bodyMousedownHandler);
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

    _showMenu() {
        this.set('showMenu', true);

        // focus the search immediately so that you can filter immediately
        run.schedule('afterRender', this, function () {
            this._focusSearch();
        });

        // watch the window for mousedown events so that we can close the menu
        // when we detect a click outside
        this._bodyMousedownHandler = run.bind(this, (event) => {
            this._handleBodyMousedown(event);
        });
        window.addEventListener('mousedown', this._bodyMousedownHandler);

        // store a reference to our range because it will change underneath
        // us as editor focus is lost
        this._editorRange = this.get('editorRange');
    },

    _hideMenu() {
        if (this.get('showMenu')) {
            // reset our cached editorRange
            this._editorRange = null;

            // stop watching the body for clicks
            window.removeEventListener('mousedown', this._bodyMousedownHandler);

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

    _handleBodyMousedown(event) {
        if (!event.target.closest(`#${this.elementId}`)) {
            this._hideMenu();
        }
    }

});
