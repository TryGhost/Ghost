import Component from '@glimmer/component';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhKoenigEditorLexical extends Component {
    @service settings;
    @service feature;

    containerElement = null;
    titleElement = null;
    excerptElement = null;
    mousedownY = 0;
    uploadUrl = `${ghostPaths().apiRoot}/images/upload/`;

    editorAPI = null;
    secondaryEditorAPI = null;
    skipFocusEditor = false;

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

    get excerpt() {
        return this.args.excerpt || '';
    }

    @action
    registerElement(element) {
        this.containerElement = element;
    }

    @action
    trackMousedown(event) {
        // triggered when a mousedown is registered on .gh-koenig-editor-pane
        this.mousedownY = event.clientY;

        // mousedown can select a card which can deselect another card meaning the
        // mouseup/click event can occur outside of the initially clicked card, in
        // which case we don't want to then "re-focus" the editor and cause unexpected
        // selection changes
        let skipFocus = false;
        for (const elem of (event.path || event.composedPath())) {
            if (elem.matches?.('[data-lexical-decorator], [data-kg-slash-menu]')) {
                skipFocus = true;
                break;
            }
        }

        if (skipFocus) {
            this.skipFocusEditor = true;
        }
    }

    @action
    editorPaneDragover(event) {
        event.preventDefault();
    }

    @action
    editorPaneDrop(event) {
        if (event.dataTransfer.files.length > 0) {
            event.preventDefault();
            this.editorAPI?.insertFiles(Array.from(event.dataTransfer.files));
        }
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

    @action
    onTitleKeydown(event) {
        if (this.feature.editorExcerpt) {
            // move cursor to the excerpt on
            // - Tab (handled by browser)
            // - Arrow Down/Right when input is empty or caret at end of input
            // - Enter
            const {key} = event;
            const {value, selectionStart} = event.target;

            if (key === 'Enter') {
                event.preventDefault();
                this.excerptElement?.focus();
            }

            if ((key === 'ArrowDown' || key === 'ArrowRight') && !event.shiftKey) {
                const couldLeaveTitle = !value || selectionStart === value.length;

                if (couldLeaveTitle) {
                    event.preventDefault();
                    this.excerptElement?.focus();
                }
            }
        } else {
            // move cursor to the editor on
            // - Tab
            // - Arrow Down/Right when input is empty or caret at end of input
            // - Enter, creating an empty paragraph when editor is not empty
            const {editorAPI} = this;

            if (!editorAPI || event.originalEvent.isComposing) {
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
    }

    // Subtitle ("excerpt") Actions -------------------------------------------

    @action
    registerExcerptElement(element) {
        this.excerptElement = element;
    }

    @action
    focusExcerpt() {
        this.excerptElement?.focus();

        // timeout ensures this occurs after the keyboard events
        setTimeout(() => {
            this.excerptElement?.setSelectionRange(-1, -1);
        }, 0);
    }

    @action
    onExcerptInput(event) {
        this.args.setExcerpt?.(event.target.value);
    }

    @action
    onExcerptKeydown(event) {
        // move cursor to the title on
        // - Shift+Tab (handled by the browser)
        // - Arrow Up/Left when input is empty or caret at start of input
        // move cursor to the editor on
        // - Tab
        // - Arrow Down/Right when input is empty or caret at end of input
        // - Enter, creating an empty paragraph when editor is not empty
        const {key} = event;
        const {value, selectionStart} = event.target;

        if ((key === 'ArrowUp' || key === 'ArrowLeft') && !event.shiftKey) {
            const couldLeaveTitle = !value || selectionStart === 0;

            if (couldLeaveTitle) {
                event.preventDefault();
                this.focusTitle();
            }
        }

        const {editorAPI} = this;
        const couldLeaveTitle = !value || selectionStart === value.length;
        const arrowLeavingTitle = (key === 'ArrowRight' || key === 'ArrowDown') && couldLeaveTitle;

        if (key === 'Enter' || (key === 'Tab' && !event.shiftKey) || arrowLeavingTitle) {
            event.preventDefault();

            if (key === 'Enter' && !editorAPI.editorIsEmpty()) {
                editorAPI.insertParagraphAtTop({focus: true});
            } else {
                editorAPI.focusEditor({position: 'top'});
            }
        }
    }

    // move cursor to the editor on

    // Body actions ------------------------------------------------------------

    @action
    registerEditorAPI(API) {
        this.editorAPI = API;
        this.args.registerAPI(API);
    }

    @action
    registerSecondaryEditorAPI(API) {
        this.secondaryEditorAPI = API;
        this.args.registerSecondaryAPI(API);
    }

    // focus the editor when the editor canvas is clicked below the editor content,
    // otherwise the browser will defocus the editor and the cursor will disappear
    @action
    focusEditor(event) {
        if (!this.skipFocusEditor && event.target.classList.contains('gh-koenig-editor-pane') && this.editorAPI) {
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
            }
        }

        this.skipFocusEditor = false;
    }
}
