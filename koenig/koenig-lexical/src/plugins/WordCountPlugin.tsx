import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import throttle from 'lodash/throttle';
import {$getRoot, $isElementNode} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {utils} from '@tryghost/helpers';

const {countWords} = utils;

// TODO: language is not currently used but in future we should switch to using
// Intl.Segmenter to get more accurate word counts for non-latin languages. For
// now we're using Ghost's existing countWords util which is regex based
export const WordCountPlugin = ({onChange, language = 'en'} = {}) => {
    const [editor] = useLexicalComposerContext();
    const {onWordCountChangeRef} = React.useContext(KoenigComposerContext);

    React.useLayoutEffect(() => {
        if (!onChange) {
            return;
        }

        // store onChange in context so that we can use it in the KoenigNestedComposer
        // to render nested <WordCountPlugin /> without needing to pass onChange down
        if (!editor._parentEditor) {
            onWordCountChangeRef.current = onChange;
        }

        let lastWordCount = 0;

        const countEditorWords = () => {
            let wordCount = 0;
            let topLevelEditor = editor;

            while (topLevelEditor._parentEditor) {
                topLevelEditor = topLevelEditor._parentEditor;
            }

            topLevelEditor.getEditorState().read(() => {
                // NOTE: we can't use RootNode.getTextContent() here because it will
                // return cached text content when there are no dirty nodes which is
                // the case for changes in nested editors

                const rootNode = $getRoot();

                // Borrowing code from ElementNode.getTextContent() to bypass the cache
                let textContent = '';
                const children = rootNode.getChildren();
                const childrenLength = children.length;
                for (let i = 0; i < childrenLength; i++) {
                    const child = children[i];
                    textContent += child.getTextContent();
                    if (
                        $isElementNode(child) &&
                        i !== childrenLength - 1 &&
                        !child.isInline()
                    ) {
                        textContent += `\n\n`;
                    }
                }

                wordCount = countWords(textContent);
            });

            if (wordCount !== lastWordCount) {
                lastWordCount = wordCount;
                onChange(wordCount);
            }

            // start with zero word count if editor is empty
            if (wordCount === 0 && lastWordCount === 0) {
                onChange(0);
            }
        };

        countEditorWords();

        const throttledCount = throttle(countEditorWords, 200);

        const cleanupRegister = mergeRegister(
            editor.registerUpdateListener(({
                dirtyElements,
                dirtyLeaves,
                prevEditorState,
                tags
            }) => {
                if ((dirtyElements.size === 0 && dirtyLeaves.size === 0) || tags.has('history-merge') || prevEditorState.isEmpty()) {
                    return;
                }

                throttledCount();
            })
        );

        return () => {
            throttledCount.cancel();
            cleanupRegister();

            if (!editor._parentEditor) {
                onWordCountChangeRef.current = null;
            }
        };
    }, [editor, onChange, onWordCountChangeRef]);
};

export default WordCountPlugin;
