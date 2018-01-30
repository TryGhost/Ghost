import $ from 'jquery';
import Component from '@ember/component';
import layout from '../templates/components/koenig-title-input';
import {run} from '@ember/runloop';

export default Component.extend({
    layout,

    val: '',
    tagName: 'h2',
    editor: null,
    autofocus: false,

    _cachedVal: '',
    _mutationObserver: null,
    editorKeyDownListener: null,
    _hasSetupEventListeners: false,

    didReceiveAttrs() {
        if (this.get('editorHasRendered') && !this._hasSetupEventListeners) {
            let editor = this.get('editor');
            let title = this.$('.kg-title-input');

            if (this.get('editorKeyDownListener')) {
                editor.element.removeEventListener('keydown', this.get('editorKeyDownListener'));
            }
            this.set('editorKeyDownListener', this.editorKeyDown.bind(this));
            editor.element.addEventListener('keydown', this.get('editorKeyDownListener'));

            title[0].onkeydown = (event) => {
                // block the browser format keys.
                if (event.ctrlKey || event.metaKey) {
                    switch (event.keyCode) {
                    case 66: // B
                    case 98: // b
                    case 73: // I
                    case 105: // i
                    case 85: // U
                    case 117: // u
                        return false;
                    }
                }
                if (event.keyCode === 13) {
                    // enter
                    // on enter create a new paragraph at the top of the editor, this is because the first item may be a card.
                    editor.run((postEditor) => {
                        let marker = editor.builder.createMarker('');
                        let newSection = editor.builder.createMarkupSection('p', [marker]);
                        postEditor.insertSectionBefore(editor.post.sections, newSection, editor.post.sections.head);

                        let range = newSection.toRange();
                        range.tail.offset = 0; // colapse range
                        postEditor.setRange(range);
                    });
                    return false;
                }

                // down key
                // if we're within ten pixels of the bottom of this element then we try and figure out where to position
                // the cursor in the editor.
                if (event.keyCode === 40) {
                    if (!window.getSelection().rangeCount) {
                        return;
                    }
                    let range = window.getSelection().getRangeAt(0); // get the actual range within the DOM.
                    let cursorPositionOnScreen = range.getBoundingClientRect();

                    // in safari getBoundingClientRect on a range does not work if the range is collapsed.
                    if (cursorPositionOnScreen.bottom === 0) {
                        cursorPositionOnScreen = range.getClientRects()[0];
                    }

                    let offset = title.offset();
                    let bottomOfHeading = offset.top + title.height();
                    if (cursorPositionOnScreen.bottom > bottomOfHeading - 13) {
                        let editor = this.get('editor');
                        let loc = editor.element.getBoundingClientRect();

                        // if the first element is a card then that is always going to be selected.
                        if (editor.post.sections.head && editor.post.sections.head.isCardSection) {
                            run.next(() => {
                                window.getSelection().removeAllRanges();
                                $(editor.post.sections.head.renderNode.element).children('div').click();
                            });
                            return;
                        }
                        let cursorPositionInEditor = editor.positionAtPoint(cursorPositionOnScreen.left, loc.top);
                        if (!cursorPositionInEditor || cursorPositionInEditor.isBlank) {
                            editor.element.focus();
                        } else {
                            editor.selectRange(cursorPositionInEditor.toRange());
                        }
                        return false;
                    }
                }
            };

            this._hasSetupEventListeners = true;
        }
    },

    didInsertElement() {
        this._super(...arguments);

        let title = this.$('.kg-title-input');

        // setup mutation observer
        let mutationObserver = new MutationObserver(() => {
            // on mutate we update.
            if (title[0].textContent !== '') {
                title.removeClass('no-content');
            } else {
                title.addClass('no-content');
            }

            // there is no consistency in how characters like nbsp and zwd are handled across browsers
            // so we replace every whitespace character with a ' '
            // note: this means that we can't have tabs in the title.
            let textContent = title[0].textContent.replace(/\s/g, ' ');
            let innerHTML = title[0].innerHTML.replace(/(&nbsp;|\s)/g, ' ');

            // sanity check if there is formatting reset it.
            if (innerHTML && innerHTML !== textContent) {
                // run in next runloop so that we don't get stuck in infinite loops.
                run.next(() => {
                    title[0].innerHTML = textContent;
                });
            }

            if (this.get('val') !== textContent) {
                let onChangeAction = this.get('onChange');
                let updateAction = this.get('update');

                this.set('_cachedVal', textContent);
                this.set('val', textContent);

                if (onChangeAction) {
                    onChangeAction(textContent);
                }
                if (updateAction) {
                    updateAction(textContent);
                }
            }
        });

        mutationObserver.observe(title[0], {childList: true, characterData: true, subtree: true});
        this.set('_mutationObserver', mutationObserver);
    },

    didRender() {
        let title = this.$('.kg-title-input');
        if (!this.get('val')) {
            title.addClass('no-content');
        } else if (this.get('val') !== this.get('_cachedVal')) {
            title.html(this.get('val'));
        }
    },

    willDestroyElement() {
        this.get('_mutationObserver').disconnect();
        this.$('.kg-title-input')[0].onkeydown = null;
        let editor = this.get('editor');
        if (editor) {
            editor.element.removeEventListener('keydown', this.get('editorKeyDownListener'));
        }
    },

    editorKeyDown(event) {
        // if the editor has a menu open then we don't want to capture inputs.
        if (this.get('editorMenuIsOpen')) {
            return;
        }
        let editor = this.get('editor');
        if (event.keyCode === 38) { // up arrow
            let selection = window.getSelection();
            if (!selection.rangeCount) {
                return;
            }
            let range = selection.getRangeAt(0); // get the actual range within the DOM.
            let cursorPositionOnScreen = range.getBoundingClientRect();
            if (cursorPositionOnScreen.bottom === 0) {
                cursorPositionOnScreen = range.getClientRects()[0];
            }
            let topOfEditor = editor.element.getBoundingClientRect().top;

            // if the current paragraph is empty then the position is 0
            if (!cursorPositionOnScreen || cursorPositionOnScreen.top === 0) {
                if (editor.activeSection && editor.activeSection.renderNode) {
                    cursorPositionOnScreen = editor.activeSection.renderNode.element.getBoundingClientRect();
                } else {
                    this.setCursorAtOffset(0);
                    return false;
                }
            }

            if (cursorPositionOnScreen.top < topOfEditor + 33) {
                let offset = this.getOffsetAtPosition(cursorPositionOnScreen.left);
                this.setCursorAtOffset(offset);

                return false;
            }
        }
    },

    // gets the character in the last line of the title that best matches the editor
    getOffsetAtPosition(horizontalOffset) {
        let [title] = this.$('.kg-title-input')[0].childNodes;
        if (!title || !title.textContent) {
            return 0;
        }
        let len = title.textContent.length;
        let range = document.createRange();

        for (let i = len - 1; i > -1; i -= 1) {
            range.setStart(title, i);
            range.setEnd(title, i + 1);
            let rect = range.getBoundingClientRect();
            if (rect.top === rect.bottom) {
                continue;
            }
            if (rect.left <= horizontalOffset && rect.right >= horizontalOffset) {
                // if the horizontalOffset is on the left hand side of the
                // character then return `i`, if it's on the right return `i + 1`
                return i + (horizontalOffset >= (rect.left + rect.right) / 2 ? 1 : 0);
            }
        }

        return len;
    },

    // position the users cursor in the title based on the offset.
    // unfortunately creating a range and adding it to the selection doesn't work.
    // In Chrome it ignores the new range and places the cursor at the start of the element.
    // in Firefox it places the cursor at the correct place but refuses to accept keyboard input.
    setCursorAtOffset(offset) {
        let [title] = this.$('.kg-title-input');
        title.focus();
        let selection = window.getSelection();

        run.next(() => {
            if (selection.modify) {
                for (let i = 0; i < offset; i += 1) {
                    selection.modify('move', 'forward', 'character');
                }
            }
        });
    }
});
