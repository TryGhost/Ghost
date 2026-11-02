import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import throttle from 'lodash/throttle';
import {$getSelection, $isRangeSelection, BLUR_COMMAND, COMMAND_PRIORITY_LOW, FOCUS_COMMAND} from 'lexical';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {utils} from '@tryghost/helpers';

const {countWords} = utils;

// Reports the selection's word count: an integer (0 allowed) while a
// non-collapsed range selection exists, null otherwise.
export const SelectionWordCountPlugin = ({onChange} = {}) => {
    const [editor] = useLexicalComposerContext();
    const {onSelectionWordCountChangeRef, selectionWordCountsRef, lastEmittedSelectionWordCountRef} = React.useContext(KoenigComposerContext);

    React.useLayoutEffect(() => {
        if (!onChange) {
            return;
        }

        // store onChange in context so that KoenigNestedComposer can render
        // a nested <SelectionWordCountPlugin /> without passing onChange down
        if (!editor._parentEditor) {
            onSelectionWordCountChangeRef.current = onChange;
        }

        // a selection lives in exactly one editor at a time but a plugin
        // instance exists per editor (main + nested caption editors). Each
        // instance writes its own editor's selection count into the shared
        // map and emits the combined value so that the emission order
        // between editor instances doesn't matter
        const counts = selectionWordCountsRef.current;

        const emitCombined = () => {
            let combined = null;

            for (const count of counts.values()) {
                if (count !== null) {
                    combined = count;
                    break;
                }
            }

            // dedup lives on the composer-level ref rather than in this
            // closure so that no instance re-emits a value another
            // instance has already delivered
            if (combined !== lastEmittedSelectionWordCountRef.current) {
                lastEmittedSelectionWordCountRef.current = combined;
                onChange(combined);
            }
        };

        const updateSelectionCount = () => {
            // a blurred editor keeps its last selection even though the page no longer shows it
            const rootElement = editor.getRootElement();
            const hasFocus = !!rootElement && rootElement.ownerDocument.activeElement === rootElement;

            editor.getEditorState().read(() => {
                const selection = $getSelection();

                if (hasFocus && $isRangeSelection(selection) && !selection.isCollapsed()) {
                    counts.set(editor.getKey(), countWords(selection.getTextContent()));
                } else {
                    counts.set(editor.getKey(), null);
                }
            });

            emitCombined();
        };

        updateSelectionCount();

        const throttledUpdate = throttle(updateSelectionCount, 200);

        // update listeners fire after every commit, including selection-only
        // changes, so a SELECTION_CHANGE_COMMAND handler isn't needed
        const cleanupRegister = mergeRegister(
            editor.registerUpdateListener(() => {
                throttledUpdate();
            }),
            editor.registerCommand(BLUR_COMMAND, () => {
                throttledUpdate.cancel();
                counts.set(editor.getKey(), null);
                emitCombined();
                return false;
            }, COMMAND_PRIORITY_LOW),
            editor.registerCommand(FOCUS_COMMAND, () => {
                throttledUpdate();
                return false;
            }, COMMAND_PRIORITY_LOW)
        );

        return () => {
            throttledUpdate.cancel();
            cleanupRegister();
            counts.delete(editor.getKey());
            // an unmounting editor may hold the active selection (e.g. a
            // card deleted mid-edit) so re-emit to drop its count
            emitCombined();

            if (!editor._parentEditor) {
                onSelectionWordCountChangeRef.current = null;
            }
        };
    }, [editor, onChange, onSelectionWordCountChangeRef, selectionWordCountsRef, lastEmittedSelectionWordCountRef]);
};

export default SelectionWordCountPlugin;
