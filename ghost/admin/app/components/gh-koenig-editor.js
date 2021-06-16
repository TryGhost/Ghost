import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhKoenigEditorComponent extends Component {
    containerElement = null;
    titleElement = null;
    koenigEditor = null;
    mousedownY = 0;

    @tracked titleIsHovered = false;
    @tracked titleIsFocused = false;

    get title() {
        return this.args.title === '(Untitled)' ? '' : this.args.title;
    }

    @action
    registerElement(element) {
        this.containerElement = element;
    }

    @action
    trackMousedown(event) {
        // triggered when a mousedown is registered on .gh-koenig-editor-pane
        this.mousedownY = event.clientY;
    }

    // Title actions -----------------------------------------------------------

    @action
    registerTitleElement(element) {
        this.titleElement = element;

        // this is needed because focus event handler won't be fired if input has focus when rendering
        if (this.titleElement === document.activeElement) {
            this.titleIsFocused = true;
        }
    }

    @action
    updateTitle(event) {
        this.args.onTitleChange?.(event.target.value);
    }

    @action
    focusTitle() {
        this.titleElement.focus();
    }

    @action
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

            this.koenigEditor.focus();
        }
    }

    // Body actions ------------------------------------------------------------

    @action
    onEditorCreated(koenig) {
        this._setupEditor(koenig);
        this.args.onEditorCreated?.(koenig);
    }

    @action
    focusEditor(event) {
        if (event.target.classList.contains('gh-koenig-editor-pane')) {
            let editorCanvas = this.koenigEditor.element;
            let {bottom} = editorCanvas.getBoundingClientRect();

            // if a mousedown and subsequent mouseup occurs below the editor
            // canvas, focus the editor and put the cursor at the end of the
            // document
            if (this.mousedownY > bottom && event.clientY > bottom) {
                let {post} = this.koenigEditor;
                let range = post.toRange();
                let {tailSection} = range;

                event.preventDefault();
                this.koenigEditor.focus();

                // we should always have a visible cursor when focusing
                // at the bottom so create an empty paragraph if last
                // section is a card
                if (tailSection.isCardSection) {
                    this.koenigEditor.run((postEditor) => {
                        let newSection = postEditor.builder.createMarkupSection('p');
                        postEditor.insertSectionAtEnd(newSection);
                        tailSection = newSection;
                    });
                }

                this.koenigEditor.selectRange(tailSection.tailPosition());

                // ensure we're scrolled to the bottom
                this.containerElement.scrollTop = this.containerElement.scrollHeight;
            }
        }
    }

    _setupEditor(koenig) {
        let component = this;

        this.koenigEditor = koenig.editor;

        // focus the title when pressing SHIFT+TAB
        this.koenigEditor.registerKeyCommand({
            str: 'SHIFT+TAB',
            run() {
                component.focusTitle();
                return true;
            }
        });
    }

    _addParaAtTop() {
        if (!this.koenigEditor) {
            return;
        }

        let editor = this.koenigEditor;
        let section = editor.post.toRange().head.section;

        // create a blank paragraph at the top of the editor unless it's already
        // a blank paragraph
        if (section.isListItem || !section.isBlank || section.text !== '') {
            editor.run((postEditor) => {
                let {builder} = postEditor;
                let newPara = builder.createMarkupSection('p');
                let sections = section.isListItem ? section.parent.parent.sections : section.parent.sections;

                postEditor.insertSectionBefore(sections, newPara, section);
            });
        }
    }
}
