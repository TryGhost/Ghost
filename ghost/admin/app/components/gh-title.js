import Component from 'ember-component';

export default Component.extend({
    _cachedValue: '',
    _mutationObserver: null,
    tagName: 'h2',
    didRender() {
        if (this._rendered) {
            return;
        }

        let title = this.$('div');
        if (!this.get('value')) {
            title.addClass('no-content');
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
                if (cursorPositionOnScreen.bottom > bottomOfHeading - 33) {
                    let {editor} = window; // hmmm, this is nasty!
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

            // sanity check if there is formatting reset it.
            let {textContent} = title[0]; // eslint-disable-line
            if (title[0].innerHTML !== textContent && title[0].innerHTML) {
                title[0].innerHTML = textContent;
                // todo: retain the range position.
            }

            if (this.get('_cachedValue') !== textContent) {
                this.set('_cacheValue', textContent);
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
