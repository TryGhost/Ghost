import FloatingToolbar from '../../components/ui/FloatingToolbar';
import FormatToolbar from './FormatToolbar';
import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import debounce from 'lodash/debounce';
import {$getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, DELETE_CHARACTER_COMMAND} from 'lexical';
import {LinkActionToolbar} from './LinkActionToolbar.jsx';
import {LinkActionToolbarWithSearch} from './LinkActionToolbarWithSearch.jsx';
import {SnippetActionToolbar} from './SnippetActionToolbar';
import {mergeRegister} from '@lexical/utils';

// don't show the toolbar until the mouse has moved a certain distance,
// avoids accidental toolbar display when clicking buttons that select content
const MOUSE_MOVE_THRESHOLD = 5;

export const toolbarItemTypes = {
    snippet: 'snippet',
    link: 'link',
    text: 'text'
};

export function FloatingFormatToolbar({
    editor,
    anchorElem,
    href,
    isSnippetsEnabled,
    toolbarItemType,
    setToolbarItemType,
    hiddenFormats = []
}) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const isLinkSearchEnabled = typeof cardConfig?.searchLinks === 'function' || false;

    const toolbarRef = React.useRef(null);

    const isLinkSearchToolbarVisible = toolbarItemType === toolbarItemTypes.link && isLinkSearchEnabled;

    // toolbar opacity is 0 by default
    // shouldn't display until selection via mouse is complete to avoid toolbar re-positioning while dragging
    const showToolbarIfHidden = React.useCallback((e) => {
        if (toolbarItemType && toolbarRef.current?.style.opacity === '0') {
            toolbarRef.current.style.opacity = '1';
        }
    }, [toolbarItemType]);

    React.useEffect(() => {
        const toggle = (e) => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const selectedNodeMatchesTarget = selection.getNodes().find((node) => {
                        const element = editor.getElementByKey(node.getKey());
                        return element && (element.contains(e.target) || e.target.contains(element));
                    });

                    if (selectedNodeMatchesTarget) {
                        showToolbarIfHidden(e);
                    }
                }
            });
        };

        document.addEventListener('mouseup', toggle); // desktop
        document.addEventListener('touchend', toggle); // mobile

        return () => {
            document.removeEventListener('mouseup', toggle); // desktop
            document.removeEventListener('touchend', toggle); // mobile
        };
    }, [editor, showToolbarIfHidden]);

    // clear out toolbar when use removes selected content
    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                DELETE_CHARACTER_COMMAND,
                () => {
                    setToolbarItemType(null);
                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor, setToolbarItemType]);

    React.useEffect(() => {
        let initialPosition = null;

        const onMouseMove = (e) => {
            // ignore drag events
            if (e?.buttons > 0) {
                return;
            }

            // avoid toggling toolbar until mouse has moved a certain distance
            if (!initialPosition) {
                initialPosition = {x: e.clientX, y: e.clientY};
            }

            const distanceMoved = Math.sqrt(
                Math.pow(e.clientX - initialPosition.x, 2) +
                Math.pow(e.clientY - initialPosition.y, 2)
            );

            if (distanceMoved < MOUSE_MOVE_THRESHOLD) {
                return;
            }

            // reset initial position after threshold is met
            initialPosition = null;

            // should not show floating toolbar when we don't have a text selection
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if (selection === null || !$isRangeSelection(selection)) {
                    return;
                }
                if (selection.getTextContent() !== null) {
                    showToolbarIfHidden();
                }
            });
        };
        const debouncedOnMouseMove = debounce(onMouseMove, 10);
        document.addEventListener('mousemove', debouncedOnMouseMove);
        return () => {
            document.removeEventListener('mousemove', debouncedOnMouseMove);
        };
    }, [editor, showToolbarIfHidden]);

    const handleActionToolbarClose = () => {
        setToolbarItemType(null);
    };

    const isSnippetToolbar = toolbarItemTypes.snippet === toolbarItemType;
    const isLinkToolbar = toolbarItemTypes.link === toolbarItemType;
    const isTextToolbar = toolbarItemTypes.text === toolbarItemType;

    const showTextToolbar = isTextToolbar || (isLinkSearchEnabled && isLinkToolbar);

    // When link searching is enabled the link toolbar has alternative styling
    // where the search input and results are displayed below the format toolbar.
    //
    // When link searching is disabled the link input toolbar visually replaces
    // the format toolbar.

    return (
        <>
            <FloatingToolbar
                anchorElem={anchorElem}
                // toolbar opacity is 0 by default
                // shouldn't display until selection via mouse is complete to avoid toolbar re-positioning while dragging
                controlOpacity={!isTextToolbar}
                editor={editor}
                isVisible={!!toolbarItemType}
                shouldReposition={toolbarItemType !== toolbarItemTypes.text} // format toolbar shouldn't reposition when applying formats
                toolbarRef={toolbarRef}
            >
                {isSnippetToolbar && (
                    <SnippetActionToolbar
                        onClose={handleActionToolbarClose}
                    />
                )}

                {(isLinkToolbar && !isLinkSearchEnabled) && (
                    <LinkActionToolbar
                        href={href}
                        onClose={handleActionToolbarClose}
                    />
                )}

                {showTextToolbar && (
                    <FormatToolbar
                        editor={editor}
                        hiddenFormats={hiddenFormats}
                        isLinkSelected={!!href || (isLinkSearchEnabled && isLinkToolbar)}
                        isSnippetsEnabled={isSnippetsEnabled}
                        onLinkClick={() => setToolbarItemType(toolbarItemTypes.link)}
                        onSnippetClick={() => setToolbarItemType(toolbarItemTypes.snippet)}
                    />
                )}

            </FloatingToolbar>

            {isLinkSearchToolbarVisible && (
                <LinkActionToolbarWithSearch
                    anchorElem={anchorElem}
                    href={href}
                    onClose={handleActionToolbarClose}
                />
            )}
        </>
    );
}
