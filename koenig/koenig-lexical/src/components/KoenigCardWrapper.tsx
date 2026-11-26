import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {CardWrapper} from './ui/CardWrapper';
import {EDIT_CARD_COMMAND, SELECT_CARD_COMMAND, SHOW_CARD_VISIBILITY_SETTINGS_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {cardHasEditMode, isCardVisibilityAvailable} from '../utils/visibility';
import {isDocumentEditable, useIsDocumentEditable} from '../hooks/useIsDocumentEditable';
import {mergeRegister} from '@lexical/utils';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {CardWidth} from '@tryghost/kg-default-nodes';

interface KoenigCardWrapperProps {
    nodeKey: string;
    width?: CardWidth;
    wrapperStyle?: string;
    IndicatorIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    children?: React.ReactNode;
}

const KoenigCardWrapper = ({nodeKey, width, wrapperStyle, IndicatorIcon, children}: KoenigCardWrapperProps) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const [cardType, setCardType] = React.useState<string | null>(null);
    const [captionHasFocus, setCaptionHasFocus] = React.useState<boolean | null>(null);
    const [cardWidth, setCardWidth] = React.useState<CardWidth>(width || 'regular');
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const skipClick = React.useRef(false);

    const {selectedCardKey, isEditingCard, isDragging} = useKoenigSelectedCardContext();
    const isReadOnly = !useIsDocumentEditable();

    const isSelected = selectedCardKey === nodeKey;
    const isEditing = isSelected && isEditingCard;

    // the stylesheet takes the pointer from a read-only card, and new focus is refused here. Not
    // `inert`, which would also keep its text out of selections, find-in-page and screen readers
    const refuseFocus = React.useCallback((event: React.FocusEvent<HTMLElement>) => {
        event.target.blur?.();
    }, []);

    // a control that had focus keeps it, so its keys and the clicks they make are refused. Shortcuts
    // pass once the card is no longer selected: until that renders, its editing controls would take them
    const refuseInput = React.useCallback((event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
        if (isDocumentEditable(editor) || !event.currentTarget.contains(event.target as Node)) {
            return;
        }

        const key = 'key' in event ? event.key : undefined;
        const isShortcut = event.ctrlKey || event.metaKey || (key !== undefined && ['Shift', 'Control', 'Alt', 'Meta'].includes(key));
        if (event.type !== 'click' && isShortcut && !isSelected) {
            return;
        }

        event.stopPropagation();

        if (key !== 'Tab') {
            event.preventDefault();
        }
    }, [editor, isSelected]);

    // a file chosen in a dialog that was opened before the document went read-only is not taken,
    // nor kept by the input, which would not report the same file chosen again
    const refuseChange = React.useCallback((event: React.FormEvent<HTMLDivElement>) => {
        if (isDocumentEditable(editor) || !event.currentTarget.contains(event.target as Node)) {
            return;
        }

        event.stopPropagation();

        if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
            event.target.value = '';
        }
    }, [editor]);

    const handleVisibilityToggle = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, {cardKey: nodeKey});
    }, [editor, nodeKey]);

    React.useLayoutEffect(() => {
        editor.getEditorState().read(() => {
            const cardNode = $getNodeByKey(nodeKey);
            setCardType(cardNode?.getType() ?? null);
        });

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        return mergeRegister(
            // we register a click command at the editor level rather than the React level
            // so that we can prevent the editor's default click behaviour without also
            // preventing the click behaviour of other React components inside the card
            editor.registerCommand(
                CLICK_COMMAND,
                (event) => {
                    const target = event.target as HTMLElement | null;
                    if (!skipClick.current && containerRef.current?.contains(target)) {
                        const cardNode = $getNodeByKey(nodeKey);
                        const clickedDifferentEditor = !cardNode;
                        const clickedToolbar = target?.closest('[data-kg-allow-clickthrough="false"]');
                        const clickedSettingsPanel = target?.closest('[data-kg-settings-panel]');

                        if (isSelected && ($isKoenigCard(cardNode) && cardNode.hasEditMode() && !isEditing && !clickedToolbar && !clickedSettingsPanel)) {
                            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: !clickedDifferentEditor});
                        } else if (!isSelected) {
                            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: !clickedDifferentEditor});
                        }

                        if (clickedDifferentEditor) {
                            // click is in a different editor
                            return false;
                        }

                        return true;
                    }

                    if (skipClick.current === true) {
                        skipClick.current = false;
                        return true;
                    }

                    skipClick.current = false;
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
        );
    });

    React.useEffect(() => {
        // add a property to the parent element that's added directly by Lexical
        // so we can target it via CSS for things like spacing between stacked full-width cards
        if (containerRef.current?.parentElement) {
            // avoid setting property when 'regular' so there's less test churn
            if (cardWidth === 'regular') {
                delete containerRef.current.parentElement.dataset.kgCardWidth;
            } else {
                if (cardWidth !== width) {
                    setCardWidth(cardWidth);
                }
                // we are now using the width passed from the property instead of the state, as it is the source of truth
                containerRef.current.parentElement.dataset.kgCardWidth = width;
            }
        }
    }, [cardWidth, containerRef, width]);

    const setEditing = (shouldEdit: boolean) => {
        // convert nodeKey to int
        if (shouldEdit) {
            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
        } else if (!isSelected) {
            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});
        }
    };

    React.useEffect(() => {
        const container = containerRef.current;

        function handleMousedown(event: MouseEvent) {
            if (!isSelected && !isEditing) {
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});

                // skip CLICK_COMMAND behaviour otherwise we'll immediately enter edit mode
                skipClick.current = true;

                // in most situations we want to prevent default behaviour which
                // can cause an underlying cursor position change but inputs and
                // textareas are different and we want the focus to move to them
                // immediately when clicked
                const target = event.target as HTMLElement | null;
                const targetTagName = target?.tagName;
                const allowedTagNames = ['INPUT', 'TEXTAREA'];
                const allowClickthrough = !!target?.closest('[data-kg-allow-clickthrough]');

                if (!allowedTagNames.includes(targetTagName || '') && !allowClickthrough) {
                    event.preventDefault();
                }
            }
        }

        // cards without an edit mode of their own (image, gallery) keep a
        // second click for captions and their own controls, so their settings
        // panel opens on double-click instead
        function handleDoubleClick(event: MouseEvent) {
            const target = event.target as Element;
            if (isEditing || target.closest('[data-kg-card-toolbar], [data-kg-settings-panel], input, textarea')) {
                return;
            }

            // double-clicking a word in a caption should select it, not open the panel
            if (target.closest('[contenteditable]')?.getAttribute('contenteditable') === 'true') {
                return;
            }

            let shouldEdit = false;
            editor.getEditorState().read(() => {
                const cardNode = $getNodeByKey(nodeKey);
                shouldEdit = $isKoenigCard(cardNode) && !cardNode.hasEditMode() && cardHasEditMode(cardNode, cardConfig);
            });

            if (shouldEdit) {
                editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
            }
        }

        container?.addEventListener('mousedown', handleMousedown);
        container?.addEventListener('dblclick', handleDoubleClick);

        return () => {
            container?.removeEventListener('mousedown', handleMousedown);
            container?.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [editor, isSelected, isEditing, nodeKey, containerRef, cardConfig]);

    // only show the indicator when clicking it can open the card's visibility
    // settings, e.g. not on an empty image placeholder
    let isVisibilityActive = false;
    editor.getEditorState().read(() => {
        const cardNode = $getNodeByKey(nodeKey);
        isVisibilityActive = $isKoenigCard(cardNode)
            && isCardVisibilityAvailable(cardNode.getType(), cardConfig)
            && cardHasEditMode(cardNode, cardConfig)
            && cardNode.getIsVisibilityActive();
    });

    return (
        <CardContext.Provider value={{
            isSelected,
            captionHasFocus,
            isEditing,
            cardWidth,
            setCardWidth,
            setCaptionHasFocus,
            setEditing,
            nodeKey,
            cardContainerRef: containerRef
        }}>
            <CardWrapper
                ref={containerRef}
                cardType={cardType}
                cardWidth={width}
                data-kg-read-only={isReadOnly ? '' : undefined}
                feature={cardConfig?.feature}
                IndicatorIcon={IndicatorIcon}
                isDragging={isDragging}
                isEditing={isEditing}
                isSelected={isSelected}
                isVisibilityActive={isVisibilityActive}
                wrapperStyle={wrapperStyle}
                onChangeCapture={refuseChange}
                onClickCapture={refuseInput}
                onFocusCapture={isReadOnly ? refuseFocus : undefined}
                onIndicatorClick={handleVisibilityToggle}
                onKeyDownCapture={refuseInput}
                onKeyUpCapture={refuseInput}
            >
                {children}
            </CardWrapper>
        </CardContext.Provider>
    );
};

export default KoenigCardWrapper;
