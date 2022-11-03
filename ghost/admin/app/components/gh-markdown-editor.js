import Component from '@ember/component';
import ShortcutsMixin from 'ghost-admin/mixins/shortcuts';
import classic from 'ember-classic-decorator';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import {action, computed} from '@ember/object';
import {assign} from '@ember/polyfills';
import {classNameBindings, classNames} from '@ember-decorators/component';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isEmpty, typeOf} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/no-side-effects */
// bug in eslint-plugin-ember?

@classic
@classNames('gh-markdown-editor')
@classNameBindings(
    '_isFullScreen:gh-markdown-editor-full-screen',
    '_isSplitScreen:gh-markdown-editor-side-by-side'
)
export default class GhMarkdownEditor extends Component.extend(ShortcutsMixin) {
    @service notifications;
    @service settings;

    @inject config;

    // Public attributes
    autofocus = false;

    imageMimeTypes = null;
    isFullScreen = false;
    markdown = null;
    options = null;
    placeholder = '';
    showMarkdownHelp = false;
    uploadedImageUrls = null;
    enableSideBySide = true;
    enablePreview = true;
    enableHemingway = true;
    shortcuts = null;

    // Private
    _editor = null;

    _editorFocused = false;
    _isFullScreen = false;
    _isSplitScreen = false;
    _isHemingwayMode = false;
    _isUploading = false;
    _showUnsplash = false;
    _uploadedImageUrls = null;

    // Closure actions
    onChange() {}

    onFullScreenToggle() {}
    onImageFilesSelected() {}
    onPreviewToggle() {}
    onSplitScreenToggle() {}

    @computed('options')
    get simpleMDEOptions() {
        let options = this.options || {};
        let defaultOptions = {
            // use our Showdown config with sanitization for previews
            previewRender(markdown) {
                return formatMarkdown(markdown);
            },

            // Ghost-specific SimpleMDE toolbar config - allows us to create a
            // bridge between SimpleMDE buttons and Ember actions
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link',
                {
                    name: 'image',
                    action: () => {
                        this._openImageFileDialog();
                    },
                    className: 'fa fa-picture-o',
                    title: 'Upload Image(s)'
                },
                '|',
                {
                    name: 'preview',
                    action: () => {
                        this._togglePreview();
                    },
                    className: 'fa fa-eye no-disable',
                    title: 'Render Preview (Ctrl-Alt-R)',
                    useCtrlOnMac: true
                },
                {
                    name: 'side-by-side',
                    action: () => {
                        this.send('toggleSplitScreen');
                    },
                    className: 'fa fa-columns no-disable no-mobile',
                    title: 'Side-by-side Preview (Ctrl-Alt-P)',
                    useCtrlOnMac: true
                },
                '|',
                {
                    name: 'spellcheck',
                    action: () => {
                        this._toggleSpellcheck();
                    },
                    className: 'fa fa-check',
                    title: 'Spellcheck (Ctrl-Alt-S)',
                    useCtrlOnMac: true
                },
                {
                    name: 'hemingway',
                    action: () => {
                        this._toggleHemingway();
                    },
                    className: 'fa fa-h-square',
                    title: 'Hemingway Mode (Ctrl-Alt-H)',
                    useCtrlOnMac: true
                },
                {
                    name: 'guide',
                    action: () => {
                        this.send('toggleMarkdownHelp');
                    },
                    className: 'fa fa-question-circle',
                    title: 'Markdown Guide'
                }
            ],

            // disable shortcuts for side-by-side and fullscreen because they
            // trigger interal SimpleMDE methods that will result in broken
            // layouts
            shortcuts: {
                toggleFullScreen: null,
                togglePreview: null,
                toggleSideBySide: null,
                drawImage: null
            },

            // only include the number of words in the status bar
            status: ['words']
        };

        let toolbar = defaultOptions.toolbar;

        if (!this.enableSideBySide) {
            let sideBySide = toolbar.findBy('name', 'side-by-side');
            let index = toolbar.indexOf(sideBySide);
            toolbar.splice(index, 1);
        }

        if (!this.enablePreview) {
            let preview = toolbar.findBy('name', 'preview');
            let index = toolbar.indexOf(preview);
            toolbar.splice(index, 1);
        }

        if (!this.enableHemingway) {
            let hemingway = toolbar.findBy('name', 'hemingway');
            let index = toolbar.indexOf(hemingway);
            toolbar.splice(index, 1);
        }

        if (this.settings.unsplash) {
            let image = toolbar.findBy('name', 'image');
            let index = toolbar.indexOf(image) + 1;

            toolbar.splice(index, 0, {
                name: 'unsplash',
                action: () => {
                    this.send('toggleUnsplash');
                },
                className: 'fa fa-camera',
                title: 'Add Image from Unsplash'
            });
        }

        let lastItem = null;
        toolbar.forEach((item, index) => {
            if (item === '|' && item === lastItem) {
                toolbar[index] = null;
            }
            lastItem = item;
        });
        defaultOptions.toolbar = toolbar.filter(Boolean);

        return assign(defaultOptions, options);
    }

    init() {
        super.init(...arguments);

        let shortcuts = {};
        shortcuts[`${ctrlOrCmd}+shift+i`] = {action: 'openImageFileDialog'};
        shortcuts['ctrl+alt+s'] = {action: 'toggleSpellcheck'};

        if (this.enablePreview) {
            shortcuts['ctrl+alt+r'] = {action: 'togglePreview'};
        }
        if (this.enableSideBySide) {
            shortcuts['ctrl+alt+p'] = {action: 'toggleSplitScreen'};
        }
        if (this.enableHemingway) {
            shortcuts['ctrl+alt+h'] = {action: 'toggleHemingway'};
        }

        this.shortcuts = shortcuts;
    }

    // extract markdown content from single markdown card
    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        let uploadedImageUrls = this.uploadedImageUrls;
        if (!isEmpty(uploadedImageUrls) && uploadedImageUrls !== this._uploadedImageUrls) {
            this._uploadedImageUrls = uploadedImageUrls;

            // must be done afterRender to avoid double modify of mobiledoc in a single render
            run.scheduleOnce('afterRender', this, this._insertImages, uploadedImageUrls);
        }

        // focus the editor when the markdown value changes, this is necessary
        // because both the autofocus and markdown values can change without a
        // re-render, eg. navigating from edit->new
        if (this.autofocus && this._editor && this.markdown !== this._editor.value()) {
            this.send('focusEditor');
        }

        // use internal values to avoid updating bound values
        if (!isEmpty(this.isFullScreen)) {
            this.set('_isFullScreen', this.isFullScreen);
        }
        if (!isEmpty(this.isSplitScreen)) {
            this.set('_isSplitScreen', this.isSplitScreen);
        }

        this._updateButtonState();
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this.registerShortcuts();

        // HACK: iOS will scroll the body up when activating the keyboard, this
        // causes problems in the CodeMirror based editor because iOS doesn't
        // scroll the cursor and other measurement elements which results in
        // rather unfriendly behaviour with text appearing in seemingly random
        // places and an inability to select things properly
        //
        // To get around this we use a raf loop that constantly makes sure the
        // body scrollTop is 0 when the editor is on screen
        let iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
        if (iOS) {
            this._preventBodyScroll();
        }
    }

    willDestroyElement() {
        if (this._isSplitScreen) {
            this._disconnectSplitPreview();
        }

        this.removeShortcuts();

        super.willDestroyElement(...arguments);

        if (this._preventBodyScrollId) {
            window.cancelAnimationFrame(this._preventBodyScrollId);
        }
    }

    // trigger external update, any mobiledoc updates are handled there
    @action
    updateMarkdown(markdown) {
        this.onChange(markdown);
    }

    // store a reference to the simplemde editor so that we can handle
    // focusing and image uploads
    @action
    setEditor(editor) {
        this._editor = editor;

        // disable CodeMirror's drag/drop handling as we want to handle that
        // in the parent gh-editor component
        this._editor.codemirror.setOption('dragDrop', false);

        // default to spellchecker being off
        this._editor.codemirror.setOption('mode', 'gfm');

        // add non-breaking space as a special char
        // eslint-disable-next-line no-control-regex
        this._editor.codemirror.setOption('specialChars', /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\xa0]/g);

        this._updateButtonState();
    }

    // used by the title input when the TAB or ENTER keys are pressed
    @action
    focusEditor(position = 'bottom') {
        this._editor.codemirror.focus();

        if (position === 'bottom') {
            this._editor.codemirror.execCommand('goDocEnd');
        } else if (position === 'top') {
            this._editor.codemirror.execCommand('goDocStart');
        }

        return false;
    }

    // HACK FIXME (PLEASE):
    // - clicking toolbar buttons will cause the editor to lose focus
    // - this is painful because we often want to know if the editor has focus
    //   so that we can insert images and so on in the correct place
    // - the blur event will always fire before the button action is triggered �
    // - to work around this we track focus state manually and set it to false
    //   after an arbitrary period that's long enough to allow the button action
    //   to trigger first
    // - this _may_ well have unknown issues due to browser differences,
    //   variations in performance, moon cycles, sun spots, or cosmic rays
    // - here be �
    // - (please let it work 🙏

    @action
    updateFocusState(focused) {
        if (focused) {
            this._editorFocused = true;
        } else {
            run.later(this, function () {
                this._editorFocused = false;
            }, 100);
        }
    }

    @action
    openImageFileDialog() {
        let captureSelection = this._editor.codemirror.hasFocus();
        this._openImageFileDialog({captureSelection});
    }

    @action
    toggleUnsplash() {
        if (this._showUnsplash) {
            return this.toggleProperty('_showUnsplash');
        }

        // capture current selection before it's lost by clicking toolbar btn
        if (this._editorFocused) {
            this._imageInsertSelection = {
                anchor: this._editor.codemirror.getCursor('anchor'),
                head: this._editor.codemirror.getCursor('head')
            };
        }

        this.toggleProperty('_showUnsplash');
    }

    @action
    insertUnsplashPhoto({src, alt, caption}) {
        let image = {
            alt,
            url: src,
            credit: `<small>${caption}</small>`
        };

        this._insertImages([image]);
    }

    @action
    togglePreview() {
        this._togglePreview();
    }

    @action
    toggleFullScreen() {
        let isFullScreen = !this._isFullScreen;

        this.set('_isFullScreen', isFullScreen);
        this._updateButtonState();
        this.onFullScreenToggle(isFullScreen);

        // leave split screen when exiting full screen mode
        if (!isFullScreen && this._isSplitScreen) {
            this.send('toggleSplitScreen');
        }
    }

    @action
    toggleSplitScreen() {
        let isSplitScreen = !this._isSplitScreen;
        let previewButton = this._editor.toolbarElements.preview;

        this.set('_isSplitScreen', isSplitScreen);
        this._updateButtonState();

        // set up the preview rendering and scroll sync
        // afterRender is needed so that necessary components have been
        // added/removed and editor pane length has settled
        if (isSplitScreen) {
            // disable the normal SimpleMDE preview if it's active
            if (this._editor.isPreviewActive()) {
                let preview = this._editor.toolbar.find(button => button.name === 'preview');

                preview.action(this._editor);
            }

            if (previewButton) {
                previewButton.classList.add('disabled');
            }

            run.scheduleOnce('afterRender', this, this._connectSplitPreview);
        } else {
            if (previewButton) {
                previewButton.classList.remove('disabled');
            }

            run.scheduleOnce('afterRender', this, this._disconnectSplitPreview);
        }

        this.onSplitScreenToggle(isSplitScreen);

        // go fullscreen when entering split screen mode
        this.send('toggleFullScreen');
    }

    @action
    toggleSpellcheck() {
        this._toggleSpellcheck();
    }

    @action
    toggleHemingway() {
        this._toggleHemingway();
    }

    @action
    toggleMarkdownHelp() {
        this.toggleProperty('showMarkdownHelp');
    }

    _preventBodyScroll() {
        this._preventBodyScrollId = window.requestAnimationFrame(() => {
            let body = document.querySelector('body');

            // only scroll the editor if the editor is active so that we don't
            // clobber scroll-to-input behaviour in the PSM
            if (document.activeElement.closest('.CodeMirror')) {
                if (body.scrollTop !== 0) {
                    let editor = document.querySelector('.gh-markdown-editor');

                    // scroll the editor by the same amount the body has been scrolled,
                    // this should keep the cursor on screen when opening the keyboard
                    editor.scrollTop += body.scrollTop;
                    body.scrollTop = 0;
                }
            }

            this._preventBodyScroll();
        });
    }

    _insertImages(urls) {
        let cm = this._editor.codemirror;

        // loop through urls and generate image markdown
        let images = urls.map((url) => {
            // plain url string, so extract filename from path
            if (typeOf(url) === 'string') {
                let filename = url.split('/').pop();
                let alt = filename;

                // if we have a normal filename.ext, set alt to filename -ext
                if (filename.lastIndexOf('.') > 0) {
                    alt = filename.slice(0, filename.lastIndexOf('.'));
                }

                return `![${alt}](${url})`;

            // full url object, use attrs we're given
            } else {
                let image = `![${url.alt}](${url.url})`;

                if (url.credit) {
                    image += `\n${url.credit}`;
                }

                return image;
            }
        });
        let text = images.join('\n\n');

        // clicking the image toolbar button will lose the selection so we use
        // the captured selection to re-select here
        if (this._imageInsertSelection) {
            // we want to focus but not re-position
            this.send('focusEditor', null);

            // re-select and clear the captured selection so drag/drop still
            // inserts at the correct place
            cm.setSelection(
                this._imageInsertSelection.anchor,
                this._imageInsertSelection.head
            );
            this._imageInsertSelection = null;
        }

        // focus editor and place cursor at end if not already focused
        if (!cm.hasFocus()) {
            this.send('focusEditor');
            text = `\n\n${text}\n\n`;
        }

        // insert at cursor or replace selection then position cursor at end
        // of inserted text
        cm.replaceSelection(text, 'end');
    }

    // mark the split-pane/full-screen/spellcheck buttons active when they're active
    _updateButtonState() {
        if (this._editor) {
            let sideBySideButton = this._editor.toolbarElements['side-by-side'];
            let spellcheckButton = this._editor.toolbarElements.spellcheck;
            let hemingwayButton = this._editor.toolbarElements.hemingway;

            if (sideBySideButton) {
                if (this._isSplitScreen) {
                    sideBySideButton.classList.add('active');
                } else {
                    sideBySideButton.classList.remove('active');
                }
            }

            if (spellcheckButton) {
                if (this._editor.codemirror.getOption('mode') === 'spell-checker') {
                    spellcheckButton.classList.add('active');
                } else {
                    spellcheckButton.classList.remove('active');
                }
            }

            if (hemingwayButton) {
                if (this._isHemingwayMode) {
                    hemingwayButton.classList.add('active');
                } else {
                    hemingwayButton.classList.remove('active');
                }
            }
        }
    }

    // set up the preview auto-update and scroll sync
    _connectSplitPreview() {
        let cm = this._editor.codemirror;
        let editor = this._editor;
        let editorPane = this.element.querySelector('.gh-markdown-editor-pane');
        let previewPane = this.element.querySelector('.gh-markdown-editor-preview');
        let previewContent = this.element.querySelector('.gh-markdown-editor-preview-content');

        this._editorPane = editorPane;
        this._previewPane = previewPane;
        this._previewContent = previewContent;

        // from SimpleMDE -------
        let sideBySideRenderingFunction = function () {
            previewContent.innerHTML = editor.options.previewRender(
                editor.value(),
                previewContent
            );
        };

        cm.sideBySideRenderingFunction = sideBySideRenderingFunction;

        sideBySideRenderingFunction();
        cm.on('update', cm.sideBySideRenderingFunction);

        // Refresh to fix selection being off (#309)
        cm.refresh();
        // ----------------------

        this._onEditorPaneScroll = this._scrollHandler.bind(this);
        editorPane.addEventListener('scroll', this._onEditorPaneScroll, false);
        this._scrollSync();
    }

    _scrollHandler() {
        if (!this._scrollSyncTicking) {
            requestAnimationFrame(this._scrollSync.bind(this));
        }
        this._scrollSyncTicking = true;
    }

    _scrollSync() {
        let editorPane = this._editorPane;
        let previewPane = this._previewPane;
        let height = editorPane.scrollHeight - editorPane.clientHeight;
        let ratio = parseFloat(editorPane.scrollTop) / height;
        let move = (previewPane.scrollHeight - previewPane.clientHeight) * ratio;

        previewPane.scrollTop = move;
        this._scrollSyncTicking = false;
    }

    _disconnectSplitPreview() {
        let cm = this._editor.codemirror;

        cm.off('update', cm.sideBySideRenderingFunction);
        cm.refresh();

        this._editorPane.removeEventListener('scroll', this._onEditorPaneScroll, false);
        delete this._previewPane;
        delete this._previewPaneContent;
        delete this._onEditorPaneScroll;
    }

    _openImageFileDialog({captureSelection = true} = {}) {
        if (captureSelection) {
            // capture the current selection before it's lost by clicking the
            // file input button
            this._imageInsertSelection = {
                anchor: this._editor.codemirror.getCursor('anchor'),
                head: this._editor.codemirror.getCursor('head')
            };
        }

        // trigger the dialog via gh-file-input, when a file is selected it will
        // trigger the onImageFilesSelected closure action
        this.element.querySelector('input[type="file"]').click();
    }

    // wrap SimpleMDE's built-in preview toggle so that we can trigger a closure
    // action that can apply our own classes higher up in the DOM
    _togglePreview() {
        this.onPreviewToggle(!this._editor.isPreviewActive());
        this._editor.togglePreview();
    }

    _toggleSpellcheck() {
        let cm = this._editor.codemirror;

        if (cm.getOption('mode') === 'spell-checker') {
            cm.setOption('mode', 'gfm');
        } else {
            cm.setOption('mode', 'spell-checker');
        }

        this._updateButtonState();
    }

    _toggleHemingway() {
        let cm = this._editor.codemirror;
        let extraKeys = cm.getOption('extraKeys');
        let notificationText = '';

        this._isHemingwayMode = !this._isHemingwayMode;

        if (this._isHemingwayMode) {
            notificationText = '<span class="gh-notification-title">Hemingway Mode On:</span> Write now; edit later. Backspace disabled.';
            extraKeys.Backspace = function () {};
        } else {
            notificationText = '<span class="gh-notification-title">Hemingway Mode Off:</span> Normal editing restored.';
            delete extraKeys.Backspace;
        }

        cm.setOption('extraKeys', extraKeys);
        this._updateButtonState();

        cm.focus();

        this.notifications.showNotification(
            htmlSafe(notificationText),
            {key: 'editor.hemingwaymode'}
        );
    }
}
