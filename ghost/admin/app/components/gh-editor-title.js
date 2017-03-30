import Component from 'ember-component';

export default Component.extend({
    val: '',
    _mutationObserver: null,
    tagName: 'h2',
    didRender() {
        if (this._rendered) {
            return;
        }

        let title = this.$('.gh-editor-title');
        if (!this.get('val')) {
            title.addClass('no-content');
        } else {
            title.html(this.get('val'));
        }
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
                let {editor} = window;
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
                    let {editor} = window;  // This isn't ideal.
                                            // We need to pass the editor instance so that we can `this.get('editor');`
                                            // but the editor instance is within the component and not exposed.
                                            // there's also a dependency that the editor will have with the title and the title will have with the editor
                                            // so that the cursor can move both ways (up and down) between them.
                                            // see `lib/gh-koenig/addon/gh-koenig.js` and the function `findCursorPositionFromPixel` which should actually be
                                            // encompassed here.
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
            title.removeClass('no-content');
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
                this.set('val', textContent);
                this.sendAction('onChange', textContent);
                this.sendAction('update', textContent);
            }
        });

        mutationObserver.observe(title[0], {childList: true, characterData: true, subtree: true});
        this.set('_mutationObserver', mutationObserver);
        this.set('_rendered', true);
    },
    willDestroyElement() {
        this.get('_mutationObserver').disconnect();
    }
});
