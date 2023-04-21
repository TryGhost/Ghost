import CardContext from '../context/CardContext';
import React from 'react';
import {$getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';
import {CardWrapper} from './ui/CardWrapper';
import {EDIT_CARD_COMMAND, SELECT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const KoenigCardWrapper = ({nodeKey, width, wrapperStyle, IndicatorIcon, children}) => {
    const [editor] = useLexicalComposerContext();
    const [cardType, setCardType] = React.useState(null);
    const [captionHasFocus, setCaptionHasFocus] = React.useState(null);
    const [cardWidth, setCardWidth] = React.useState(width || 'regular');
    const containerRef = React.useRef(null);

    const {selectedCardKey, isEditingCard, isDragging} = useKoenigSelectedCardContext();

    const isSelected = selectedCardKey === nodeKey;
    const isEditing = isSelected && isEditingCard;

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
                    if (containerRef.current.contains(event.target)) {
                        const cardNode = $getNodeByKey(nodeKey);

                        if (!cardNode) {
                            // click is in a different editor
                            return;
                        }

                        if (isSelected && (cardNode.hasEditMode?.() && !isEditing)) {
                            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
                        } else if (!isSelected) {
                            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});
                        }

                        return true;
                    }

                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    const setEditing = (shouldEdit) => {
        // convert nodeKey to int
        if (shouldEdit) {
            editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
        } else if (!isSelected) {
            editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey});
        }
    };

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
                cardWidth={cardWidth}
                IndicatorIcon={IndicatorIcon}
                isDragging={isDragging}
                isEditing={isEditing}
                isSelected={isSelected}
                wrapperStyle={wrapperStyle}
            >
                {children}
            </CardWrapper>
        </CardContext.Provider>
    );
};

export default KoenigCardWrapper;
