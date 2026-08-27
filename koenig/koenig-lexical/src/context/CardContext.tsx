import React from 'react';
import type {CardWidth} from '@tryghost/kg-default-nodes';

export interface CardContextType {
    isSelected: boolean;
    captionHasFocus: boolean | null;
    isEditing: boolean;
    cardWidth: CardWidth;
    setCardWidth: (width: CardWidth) => void;
    setCaptionHasFocus: (hasFocus: boolean | null) => void;
    setEditing: (editing: boolean) => void;
    nodeKey: string;
    cardContainerRef: React.RefObject<HTMLDivElement | null>;
}

const noop = () => {};

const CardContext = React.createContext<CardContextType>({
    isSelected: false,
    captionHasFocus: null,
    isEditing: false,
    cardWidth: 'regular',
    setCardWidth: noop,
    setCaptionHasFocus: noop,
    setEditing: noop,
    nodeKey: '',
    cardContainerRef: React.createRef<HTMLDivElement>()
});

export default CardContext;
