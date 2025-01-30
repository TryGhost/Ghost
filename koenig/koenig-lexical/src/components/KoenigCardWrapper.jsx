import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';
import {CardWrapper} from './ui/CardWrapper';
import {DESELECT_CARD_COMMAND, EDIT_CARD_COMMAND, SELECT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const KoenigCardWrapper = ({nodeKey, width, wrapperStyle, IndicatorIcon, children}) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const [cardType, setCardType] = React.useState(null);
    const [captionHasFocus, setCaptionHasFocus] = React.useState(null);
    const [cardWidth, setCardWidth] = React.useState(width || 'regular');
    const containerRef = React.useRef(null);
    const skipClick = React.useRef(false);

    const {selectedCardKey, isEditingCard, isDragging} = useKoenigSelectedCardContext();

    const isSelected = selectedCardKey === nodeKey;
    const isEditing = isSelected && isEditingCard;

    const toggleEditMode = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();

        editor.update(() => {
            const cardNode = $getNodeByKey(nodeKey);

            if (cardNode?.hasEditMode?.() && !isEditing) {
                editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: true});
            } else if (isEditing) {
                editor.dispatchCommand(DESELECT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: true});
            }
        });
    }, [editor, isEditing, nodeKey]);

    React.useLayoutEffect(() => {
        editor.getEditorState().read(() => {
            const cardNode = $getNodeByKey(nodeKey);
            setCardType(cardNode.getType());
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
                    if (!skipClick.current && containerRef.current.contains(event.target)) {
                        const cardNode = $getNodeByKey(nodeKey);
                        const clickedDifferentEditor = !cardNode;
                        const clickedToolbar = event.target.closest('[data-kg-allow-clickthrough="false"]');

                        if (isSelected && (cardNode?.hasEditMode?.() && !isEditing && !clickedToolbar)) {
                            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: !clickedDifferentEditor});
                        } else if (!isSelected) {
                            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: !clickedDifferentEditor});
                        }

                        if (clickedDifferentEditor) {
                            // click is in a different editor
                            return;
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
            )
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

    const setEditing = (shouldEdit) => {
        // convert nodeKey to int
        if (shouldEdit) {
            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
        } else if (!isSelected) {
            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});
        }
    };

    React.useEffect(() => {
        const container = containerRef.current;

        function handleMousedown(event) {
            if (!isSelected && !isEditing) {
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});

                // skip CLICK_COMMAND behaviour otherwise we'll immediately enter edit mode
                skipClick.current = true;

                // in most situations we want to prevent default behaviour which
                // can cause an underlying cursor position change but inputs and
                // textareas are different and we want the focus to move to them
                // immediately when clicked
                const targetTagName = event.target.tagName;
                const allowedTagNames = ['INPUT', 'TEXTAREA'];
                const allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');

                if (!allowedTagNames.includes(targetTagName) && !allowClickthrough) {
                    event.preventDefault();
                }
            }
        }

        container?.addEventListener('mousedown', handleMousedown);

        return () => {
            container?.removeEventListener('mousedown', handleMousedown);
        };
    }, [editor, isSelected, isEditing, nodeKey, containerRef]);

    let isVisibilityActive = false;
    if (cardConfig?.feature?.contentVisibilityAlpha) {
        editor.getEditorState().read(() => {
            const cardNode = $getNodeByKey(nodeKey);
            isVisibilityActive = cardNode?.getIsVisibilityActive?.();
        });
    }

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
                feature={cardConfig?.feature}
                IndicatorIcon={IndicatorIcon}
                isDragging={isDragging}
                isEditing={isEditing}
                isSelected={isSelected}
                isVisibilityActive={isVisibilityActive}
                wrapperStyle={wrapperStyle}
                onIndicatorClick={toggleEditMode}
            >
                {children}
            </CardWrapper>
        </CardContext.Provider>
    );
};

export default KoenigCardWrapper;
