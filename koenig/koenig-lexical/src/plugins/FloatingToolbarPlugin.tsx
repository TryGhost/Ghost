import React from 'react';
import {$getSelection, $isParagraphNode, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, KEY_MODIFIER_COMMAND} from 'lexical';
import {$isAtLinkSearchNode} from '@tryghost/kg-default-nodes';
import {$isLinkNode} from '@lexical/link';
import {FloatingFormatToolbar, toolbarItemTypes} from '../components/ui/FloatingFormatToolbar';
import {FloatingLinkToolbar} from '../components/ui/FloatingLinkToolbar';
import {getSelectedNode} from '../utils/getSelectedNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export default function FloatingToolbarPlugin({anchorElem = document.body, isSnippetsEnabled, hiddenFormats = []}) {
    const [editor] = useLexicalComposerContext();
    return useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled, hiddenFormats);
}

function useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled, hiddenFormats = []) {
    const [toolbarItemType, setToolbarItemType] = React.useState(null);
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

            if (!$isRangeSelection(selection) || $isAtLinkSearchNode(selection.anchor.getNode())) {
                if (toolbarItemType) {
                    setToolbarItemType(null);
                }
                return;
            }

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

    React.useEffect(() => {
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
        editor.registerCommand(
            KEY_MODIFIER_COMMAND,
            (event) => {
                const {keyCode, ctrlKey, metaKey, shiftKey} = event;
                // ctrl/cmd K with selected text should prompt for link insertion
                if (!shiftKey && keyCode === 75 && (ctrlKey || metaKey)) {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                        setToolbarItemType(toolbarItemTypes.link);
                        event.preventDefault();
                        return true;
                    }
                }
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor]);

    // use native mousedown event so the toolbar can close when something is
    // clicked outside of the editor and the selection is lost
    React.useEffect(() => {
        const handleMousedown = (event) => {
            if (!anchorElem.contains(event.target)) {
                setToolbarItemType(null);
            }
        };

        document.addEventListener('mousedown', handleMousedown);

        return () => {
            document.removeEventListener('mousedown', handleMousedown);
        };
    });

    const handleLinkEdit = (data) => {
        setToolbarItemType(toolbarItemTypes.link);
        setHref(data?.href);
    };

    return (
        <>
            <FloatingFormatToolbar
                anchorElem={anchorElem}
                editor={editor}
                hiddenFormats={hiddenFormats}
                href={href}
                isSnippetsEnabled={isSnippetsEnabled}
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
