import Component from '@ember/component';

export default Component.extend({

    // public attrs
    classNames: ['gh-koenig-editor'],
    title: '',
    titlePlaceholder: '',
    body: null,
    bodyPlaceholder: '',
    bodyAutofocus: false,

    // internal properties
    _title: null,
    _editor: null,

    // closure actions
    onTitleChange() {},
    onTitleBlur() {},
    onBodyChange() {},

    actions: {
        // triggered when a click is registered on .gh-koenig-editor-pane
        focusEditor(event) {
            // if a click occurs on the editor canvas, focus the editor and put
            // the cursor at the end of the document. Allows for a much larger
            // hit area for focusing the editor when it has no or little content
            if (event.target.tagName === 'ARTICLE' && event.target.classList.contains('koenig-editor')) {
                let {post} = this._editor;
                let range = post.toRange();

                event.preventDefault();

                this._editor.focus();
                this._editor.run((postEditor) => {
                    postEditor.setRange(range.tail.section.tailPosition());
                });

                // ensure we're scrolled to the bottom
                this.element.scrollTop = this.element.scrollHeight;
            }
        },

        /* title related actions -------------------------------------------- */

        onTitleCreated(titleElement) {
            this._title = titleElement;
        },

        onTitleChange(newTitle) {
            this.onTitleChange(newTitle);
        },

        onTitleFocusOut() {
            this.onTitleBlur();
        },

        onTitleKeydown(event) {
            let value = event.target.value;
            let selectionStart = event.target.selectionStart;

            // enter will always focus the editor
            // down arrow will only focus the editor when the cursor is at the
            // end of the input to preserve the default OS behaviour
            if (
                event.key === 'Enter' ||
                event.key === 'Tab' ||
                (event.key === 'ArrowDown' && (!value || selectionStart === value.length))
            ) {
                event.preventDefault();
                this._editor.focus();
            }
        },

        /* body related actions --------------------------------------------- */

        onEditorCreated(editor) {
            this._setupEditor(editor);
        },

        onBodyChange(newMobiledoc) {
            this.onBodyChange(newMobiledoc);
        }
    },

    /* public methods ------------------------------------------------------- */

    /* internal methods ----------------------------------------------------- */

    _setupEditor(editor) {
        let component = this;

        this._editor = editor;

        // focus the title when pressing UP if cursor is at the beginning of doc
        editor.registerKeyCommand({
            str: 'UP',
            run(editor) {
                let cursorHead = editor.cursor.offsets.head;

                if (
                    editor.hasCursor()
                    && cursorHead.offset === 0
                    && (!cursorHead.section || !cursorHead.section.prev)
                ) {
                    component._title.focus();
                    return true;
                }

                return false;
            }
        });

        // focus the title when pressing SHIFT+TAB
        editor.registerKeyCommand({
            str: 'SHIFT+TAB',
            run() {
                component._title.focus();
                return true;
            }
        });
    }
});
