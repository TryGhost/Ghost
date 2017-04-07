import Component from 'ember-component';
import computed from 'ember-computed';

export default Component.extend({
    val: '',
    _cachedVal: '',
    _mutationObserver: null,
    tagName: 'h2',
    editor: null,

    koenigEditor: computed('editor', {
        get() {
            return this.get('editor');
        },
        set(key, value) {
            this.set('editor', value);
        }
    }),
    editorKeyDownListener: null,
    didRender() {
        let editor = this.get('editor');

        let title = this.$('.gh-editor-title');
        if (!this.get('val')) {
            title.addClass('no-content');
        } else if (this.get('val') !== this.get('_cachedVal')) {
            title.html(this.get('val'));
        }

        if (!editor) {
            return;
        }
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
                //  enter
                // on enter we want to split the title, create a new paragraph in the mobile doc and insert it into the content.
                let title = this.$('.gh-editor-title');
                editor.run((postEditor) => {
                    let {anchorOffset, focusOffset} = window.getSelection();
                    let text = title.text();
                    let startText = ''; // the text before the split
                    let endText = ''; // the text after the split
                    // if the selection is not collapsed then we have to delete the text that is selected.
                    if (anchorOffset !== focusOffset) {
                        // if the start of the selection is after the end then reverse the selection
                        if (anchorOffset > focusOffset) {
                            [anchorOffset, focusOffset] = [focusOffset, anchorOffset];
                        }
                        startText = text.substring(0, anchorOffset);
                        endText = text.substring(focusOffset);
                    } else {
                        startText = text.substring(0, anchorOffset);
                        endText = text.substring(anchorOffset);
                    }

                    title.html(startText);

                    let marker = editor.builder.createMarker(endText);
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
                let range = window.getSelection().getRangeAt(0); // get the actual range within the DOM.
                let cursorPositionOnScreen =  range.getBoundingClientRect();
                let offset = title.offset();
                let bottomOfHeading =  offset.top + title.height();
                if (cursorPositionOnScreen.bottom > bottomOfHeading - 13) {
                    let editor = this.get('editor');
                    let loc = editor.element.getBoundingClientRect();

                    let cursorPositionInEditor = editor.positionAtPoint(cursorPositionOnScreen.left, loc.top);

                    if (cursorPositionInEditor.isBlank) {
                        editor.element.focus();
                    } else {
                        editor.selectRange(cursorPositionInEditor.toRange());
                    }
                    return false;
                }
            }
            // title.removeClass('no-content');
        };

        // setup mutation observer
        let mutationObserver = new MutationObserver(() => {
            // on mutate we update.
            if (title[0].textContent !== '') {
                title.removeClass('no-content');
            } else {
                title.addClass('no-content');
            }

            let {textContent} = title[0]; // eslint-disable-line
            // // sanity check if there is formatting reset it.
            // if (title[0].innerHTML !== textContent && title[0].innerHTML) {
            //     title[0].innerHTML = textContent;
            //     // todo: retain the range position.
            // }

            if (this.get('val') !== textContent) {
                this.set('_cachedVal', textContent);
                this.set('val', textContent);
                this.sendAction('onChange', textContent);
                this.sendAction('update', textContent);
            }
        });

        mutationObserver.observe(title[0], {childList: true, characterData: true, subtree: true});
        this.set('_mutationObserver', mutationObserver);
    },
    willDestroyElement() {
        this.get('_mutationObserver').disconnect();
        this.$('.gh-editor-title')[0].onkeydown = null;
        let editor = this.get('editor');
        if (editor) {
            editor.element.removeEventListener('keydown', this.get('editorKeyDownListener'));
        }
    },
    editorKeyDown(event) {
        let editor = this.get('editor');

        if (event.keyCode === 38) { // up arrow
            let selection = window.getSelection();
            if (!selection.rangeCount) {
                return;
            }
            let range = selection.getRangeAt(0); // get the actual range within the DOM.
            let cursorPositionOnScreen = range.getBoundingClientRect();
            let topOfEditor = editor.element.getBoundingClientRect().top;

            // if the current paragraph is empty then the position is 0
            if (cursorPositionOnScreen.top === 0) {
                cursorPositionOnScreen = editor.activeSection.renderNode.element.getBoundingClientRect();
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
        let [title] = this.$('.gh-editor-title')[0].childNodes;
        let len = title.textContent.length;
        let range = document.createRange();

        for (let i = len - 1; i > -1; i--) {
            // console.log(title);
            range.setStart(title, i);
            range.setEnd(title, i + 1);
            let rect = range.getBoundingClientRect();
            if (rect.top === rect.bottom) {
                continue;
            }
            if (rect.left <= horizontalOffset && rect.right >= horizontalOffset) {
                return  i + (horizontalOffset >= (rect.left + rect.right) / 2 ? 1 : 0);     // if the horizontalOffset is on the left hand side of the
                                                                                            // character then return `i`, if it's on the right return `i + 1`
            }
        }

        return len;
    },
    setCursorAtOffset() {
        let [title] = this.$('.gh-editor-title');
        title.focus();
        // the following code sets the start point based on the offest provided.
        // it works in isolation of ghost-admin but in ghost-admin it doesn't work in Chrome
        // and works in Firefox, but in firefox you can no longer edit the title once this has happened.
        // It's either an issue with ghost-admin or mobiledoc and more investigation needs to be done.
        // Probably after the beta release though.

        // let range = document.createRange();
        // let selection = window.getSelection();
        // range.setStart(title.childNodes[0], offset);
        // range.collapse(true);
        // selection.removeAllRanges();
        // selection.addRange(range);
    }
});
