import React, {useRef, useEffect, useLayoutEffect, useState} from 'react';
import PropTypes from 'prop-types';
import SimpleMDE from '@tryghost/kg-simplemde';
import MarkdownRenderer from '@tryghost/kg-markdown-html-renderer';
import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import {Modal} from '../Modal.jsx';

export function MarkdownCard({value = '', onChange, isEditing, onBlur = () => {}}) {
    const markdown = MarkdownRenderer.render(value);
    return (
        <div>
            {isEditing
                ? <MarkdownEditor value={value} onBlur={onBlur} onChange={onChange} />
                : <div dangerouslySetInnerHTML={{__html: markdown}}></div>
            }
        </div>
    );
}

MarkdownCard.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    isEditing: PropTypes.bool
};

function MarkdownEditor({
    value,
    onChange,
    onBlur,
    autofocus = true,
    placeholder = ''
}) {
    const editorRef = useRef(null);
    const editor = useRef(null);
    const [isHelpDialogOpen, setHelpDialogOpen] = useState(false);

    // init editor on component mount
    useLayoutEffect(() => {
        editor.current = new SimpleMDE({
            element: editorRef.current,
            autofocus,
            indentWithTabs: false,
            placeholder,
            tabSize: 4,
            // disable shortcuts for side-by-side and fullscreen because they
            // trigger interal SimpleMDE methods that will result in broken
            // layouts
            shortcuts: {
                toggleFullScreen: null,
                togglePreview: null,
                toggleSideBySide: null,
                drawImage: null
            },
            // hide status bar
            status: [],
            // Ghost-specific SimpleMDE toolbar config - allows us to create a
            // bridge between SimpleMDE buttons and Ember actions
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link',
                {
                    name: 'image',
                    action: () => {
                        // eslint-disable-next-line no-console
                        console.log('image');
                    },
                    className: 'fa fa-picture-o',
                    title: 'Upload Image(s)'
                },
                {
                    name: 'unsplash',
                    action: () => {
                        // eslint-disable-next-line no-console
                        console.log('toggleUnsplash');
                    },
                    className: 'fa fa-camera',
                    title: 'Add Image from Unsplash'
                },
                '|',
                {
                    name: 'spellcheck',
                    action: toggleSpellcheck,
                    className: 'fa fa-check',
                    title: 'Spellcheck (Ctrl-Alt-S)',
                    useCtrlOnMac: true
                },
                {
                    name: 'guide',
                    action: openHelpDialog,
                    className: 'fa fa-question-circle',
                    title: 'Markdown Guide'
                }
            ]
        });

        const editorInstance = editor.current;

        editorInstance.value(value ?? '');

        editorInstance.codemirror.on('change', (instance, changeObj) => {
            // avoid a "modified x twice in a single render" error that occurs
            // when the underlying value is completely swapped out
            if (changeObj.origin !== 'setValue') {
                onChange(editor.current.value());
            }
        });

        editorInstance.codemirror.on('blur', () => onBlur());

        if (autofocus) {
            editorInstance.codemirror.execCommand('goDocEnd');
        }

        // remove editor on unmount
        return () => {
            editor.current.toTextArea();
        };
    }, []);

    // update the editor when the value property changes from the outside
    useEffect(() => {
        // compare values before forcing a content reset to avoid clobbering the undo behaviour
        if (value !== editor.current.value()) {
            let cursor = editor.current.codemirror.getDoc().getCursor();
            editor.current.value(value);
            editor.current.codemirror.getDoc().setCursor(cursor);
        }
    }, [value]);

    function toggleSpellcheck() {
        let codemirror = editor.current.codemirror;

        if (codemirror.getOption('mode') === 'spell-checker') {
            codemirror.setOption('mode', 'gfm');
        } else {
            codemirror.setOption('mode', 'spell-checker');
        }

        toggleButtonClass();
    }

    function toggleButtonClass() {
        let spellcheckButton = editor.current.toolbarElements.spellcheck;

        if (spellcheckButton) {
            if (editor.current.codemirror.getOption('mode') === 'spell-checker') {
                spellcheckButton.classList.add('active');
            } else {
                spellcheckButton.classList.remove('active');
            }
        }
    }

    function openHelpDialog() {
        setHelpDialogOpen(true);
    }

    function closeHelpDialog() {
        setHelpDialogOpen(false);
    }

    return (
        <div>
            <textarea ref={editorRef}></textarea>

            <MarkdownHelpDialog onClose={closeHelpDialog} isOpen={isHelpDialogOpen} />
        </div>
    );
}

function MarkdownHelpDialog(props) {
    return (
        <Modal {...props}>
            <div className="p-8">
                <header>
                    <h1>
                        Markdown Help
                    </h1>
                </header>

                <section>
                    <table>
                        <thead>
                            <tr>
                                <th>Markdown</th>
                                <th>Result</th>
                                <th>Shortcut</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>**text**</td>
                                <td><strong>Bold</strong></td>
                                <td>Ctrl/⌘ + B</td>
                            </tr>
                            <tr>
                                <td>*text*</td>
                                <td><em>Emphasize</em></td>
                                <td>Ctrl/⌘ + I</td>
                            </tr>
                            <tr>
                                <td>~~text~~</td>
                                <td>
                                    <del>Strike-through</del>
                                </td>
                                <td></td>
                            </tr>
                            <tr>
                                <td>[title](http://)</td>
                                <td><a href="#">Link</a></td>
                                <td>Ctrl/⌘ + K</td>
                            </tr>
                            <tr>
                                <td>`code`</td>
                                <td><code>Inline Code</code></td>
                                <td>Ctrl/⌘ + Alt + C</td>
                            </tr>
                            <tr>
                                <td>![alt](http://)</td>
                                <td>Image</td>
                                <td>Ctrl/⌘ + Shift + I</td>
                            </tr>
                            <tr>
                                <td>* item</td>
                                <td>List</td>
                                <td>Ctrl/⌘ + L</td>
                            </tr>
                            <tr>
                                <td>1. item</td>
                                <td>Ordered List</td>
                                <td>Ctrl/⌘ + Alt + L</td>
                            </tr>
                            <tr>
                                <td>> quote</td>
                                <td>Blockquote</td>
                                <td>Ctrl/⌘ + '</td>
                            </tr>
                            <tr>
                                <td>==Highlight==</td>
                                <td>
                                    <mark>Highlight</mark>
                                </td>
                                <td></td>
                            </tr>
                            <tr>
                                <td># Heading</td>
                                <td>H1</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td>## Heading</td>
                                <td>H2</td>
                                <td>Ctrl/⌘ + H</td>
                            </tr>
                            <tr>
                                <td>### Heading</td>
                                <td>H3</td>
                                <td>Ctrl/⌘ + H (x2)</td>
                            </tr>
                        </tbody>
                    </table>
                    For further Markdown syntax reference: <a
                        href="https://ghost.org/help/using-the-editor/#using-markdown" target="_blank"
                        rel="noopener noreferrer">Markdown Documentation</a>
                </section>
            </div>
        </Modal>
    );
}
