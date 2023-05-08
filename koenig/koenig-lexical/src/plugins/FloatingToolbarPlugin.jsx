import React, {useEffect} from 'react';
import {$getSelection, $isParagraphNode, $isRangeSelection, $isTextNode} from 'lexical';
import {$getSelectionRangeRect} from '../utils/$getSelectionRangeRect';
import {$isLinkNode} from '@lexical/link';
import {FloatingFormatToolbar, toolbarItemTypes} from '../components/ui/FloatingFormatToolbar';
import {FloatingLinkToolbar} from '../components/ui/FloatingLinkToolbar';
import {getSelectedNode} from '../utils/getSelectedNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export default function FloatingToolbarPlugin({anchorElem = document.body, isSnippetsEnabled}) {
    const [editor] = useLexicalComposerContext();
    return useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled);
}

function useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled) {
    const [toolbarItemType, setToolbarItemType] = React.useState(null);
    const [selectionRangeRect, setSelectionRangeRect] = React.useState(null);
    const [href, setHref] = React.useState(null);

    const setToolbarType = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // Should not to pop up the floating toolbar when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();
            const nativeSelection = window.getSelection();
            const rootElement = editor.getRootElement();

            // close toolbar if selection was outside of editor
            if (
                nativeSelection !== null &&
                (
                    !$isRangeSelection(selection) ||
                    rootElement === null ||
                    !rootElement.contains(nativeSelection.anchorNode)
                )
            ) {
                setToolbarItemType(null);
                return;
            }

            if (!$isRangeSelection(selection)) {
                if (toolbarItemType) {
                    setToolbarItemType(null);
                }
                return;
            }

            // save selection range rect to calculate toolbar arrow position
            setSelectionRangeRect($getSelectionRangeRect({selection, editor}));

            const anchorNode = getSelectedNode(selection);
            const parent = anchorNode.getParent();

            if ($isLinkNode(parent)) {
                setHref(parent.getURL());
            } else if ($isLinkNode(anchorNode)) {
                setHref(anchorNode.getURL());
            } else {
                setHref('');
            }

            if (selection.getTextContent().trim() !== '' && ($isTextNode(anchorNode) || $isParagraphNode(anchorNode))) {
                setToolbarItemType(toolbarItemTypes.text);
                return;
            }

            setToolbarItemType(null);
        });
    }, [editor, toolbarItemType]);

    useEffect(() => {
        // Add a listener if the text toolbar is active. It helps to prevent events bubbling
        // when a user is interacting with inputs in the link/snippets toolbar
        if (!!toolbarItemType && toolbarItemType !== toolbarItemTypes.text) {
            return;
        }
        document.addEventListener('selectionchange', setToolbarType);
        return () => {
            document.removeEventListener('selectionchange', setToolbarType);
        };
    }, [setToolbarType, toolbarItemType]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                // save selection range rect to calculate toolbar arrow position
                if (toolbarItemType) {
                    setSelectionRangeRect($getSelectionRangeRect({selection, editor}));
                }
            });
        });
    }, [editor, toolbarItemType]);

    const handleLinkEdit = (data) => {
        setToolbarItemType(toolbarItemTypes.link);
        setHref(data.href);
    };

    return (
        <>
            <FloatingFormatToolbar
                anchorElem={anchorElem}
                editor={editor}
                href={href}
                isSnippetsEnabled={isSnippetsEnabled}
                selectionRangeRect={selectionRangeRect}
                setToolbarItemType={setToolbarItemType}
                toolbarItemType={toolbarItemType}
            />

            <FloatingLinkToolbar
                anchorElem={anchorElem}
                disabled={!!toolbarItemType} // don't show link toolbar on hover when format toolbar is active
                onEditLink={handleLinkEdit}
            />
        </>
    );
}
