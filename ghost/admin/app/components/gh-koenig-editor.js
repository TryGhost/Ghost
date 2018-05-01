import Component from '@ember/component';

export default Component.extend({

    // public attrs
    classNames: ['gh-koenig-editor', 'relative', 'w-100', 'vh-100', 'overflow-x-hidden', 'overflow-y-auto', 'z-0'],
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
        focusTitle() {
            this._title.focus();
        },

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
                ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && (!value || selectionStart === value.length))
            ) {
                event.preventDefault();

                // on Enter we also want to create a blank para if necessary
                if (event.key === 'Enter') {
                    this._addParaAtTop();
                }

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

        // focus the title when pressing SHIFT+TAB
        editor.registerKeyCommand({
            str: 'SHIFT+TAB',
            run() {
                component.send('focusTitle');
                return true;
            }
        });
    },

    _addParaAtTop() {
        if (!this._editor) {
            return;
        }

        let editor = this._editor;
        let section = editor.post.toRange().head.section;

        // create a blank paragraph at the top of the editor unless it's already
        // a blank paragraph
        if (section.isListItem || !section.isBlank || section.text !== '') {
            editor.run((postEditor) => {
                let {builder} = postEditor;
                let newPara = builder.createMarkupSection('p');

                postEditor.insertSectionBefore(section.parent.sections, newPara, section);
            });
        }
    }
});
