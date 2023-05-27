import Component from '@glimmer/component';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhKoenigEditorReactComponent extends Component {
    @service settings;

    containerElement = null;
    titleElement = null;
    mousedownY = 0;
    uploadUrl = `${ghostPaths().apiRoot}/images/upload/`;

    editorAPI = null;

    @tracked titleIsHovered = false;
    @tracked titleIsFocused = false;

    get title() {
        return this.args.title === '(Untitled)' ? '' : this.args.title;
    }

    get accentColor() {
        const color = this.settings.accentColor;
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
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
    cleanPastedTitle(event) {
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');

        if (!pastedText) {
            return;
        }

        event.preventDefault();

        const cleanValue = pastedText.replace(/(\n|\r)+/g, ' ').trim();
        document.execCommand('insertText', false, cleanValue);
    }

    @action
    focusTitle() {
        this.titleElement.focus();
    }

    // move cursor to the editor on
    // - Tab
    // - Arrow Down/Right when input is empty or caret at end of input
    // - Enter, creating an empty paragraph when editor is not empty
    @action
    onTitleKeydown(event) {
        const {editorAPI} = this;

        if (!editorAPI) {
            return;
        }

        const {key} = event;
        const {value, selectionStart} = event.target;

        const couldLeaveTitle = !value || selectionStart === value.length;
        const arrowLeavingTitle = ['ArrowDown', 'ArrowRight'].includes(key) && couldLeaveTitle;

        if (key === 'Enter' || key === 'Tab' || arrowLeavingTitle) {
            event.preventDefault();

            if (key === 'Enter' && !editorAPI.editorIsEmpty()) {
                editorAPI.insertParagraphAtTop({focus: true});
            } else {
                editorAPI.focusEditor({position: 'top'});
            }
        }
    }

    // Body actions ------------------------------------------------------------

    @action
    registerEditorAPI(API) {
        this.editorAPI = API;
        this.args.registerAPI(API);
    }

    // @action
    // onEditorCreated(koenig) {
    //     this._setupEditor(koenig);
    //     this.args.onEditorCreated?.(koenig);
    // }

    @action
    focusEditor(event) {
        if (event.target.classList.contains('gh-koenig-editor-pane')) {
            let editorCanvas = this.editorAPI.editorInstance.getRootElement();
            let {bottom} = editorCanvas.getBoundingClientRect();

            // if a mousedown and subsequent mouseup occurs below the editor
            // canvas, focus the editor and put the cursor at the end of the document
            if (event.pageY > bottom && event.clientY > bottom) {
                event.preventDefault();

                // we should always have a visible cursor when focusing
                // at the bottom so create an empty paragraph if last
                // section is a card
                if (this.editorAPI.lastNodeIsDecorator()) {
                    this.editorAPI.insertParagraphAtBottom();
                }
                // Focus the editor
                this.editorAPI.focusEditor({position: 'bottom'});

                //scroll to the bottom of the container
                // containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        }
    }

    // _setupEditor(koenig) {
    //     let component = this;

    //     this.koenigEditor = koenig;

    //     // focus the title when pressing SHIFT+TAB
    //     this.koenigEditor.registerKeyCommand({
    //         str: 'SHIFT+TAB',
    //         run() {
    //             component.focusTitle();
    //             return true;
    //         }
    //     });
    // }

    // _addParaAtTop() {
    //     if (!this.koenigEditor) {
    //         return;
    //     }

    //     let editor = this.koenigEditor;
    //     let section = editor.post.toRange().head.section;

    //     // create a blank paragraph at the top of the editor unless it's already
    //     // a blank paragraph
    //     if (section.isListItem || !section.isBlank || section.text !== '') {
    //         editor.run((postEditor) => {
    //             let {builder} = postEditor;
    //             let newPara = builder.createMarkupSection('p');
    //             let sections = section.isListItem ? section.parent.parent.sections : section.parent.sections;

    //             postEditor.insertSectionBefore(sections, newPara, section);
    //         });
    //     }
    // }
}
