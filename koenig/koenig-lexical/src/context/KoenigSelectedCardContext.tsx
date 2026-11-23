import React from 'react';
import type {NodeKey} from 'lexical';

export interface KoenigSelectedCardContextValue {
    selectedCardKey: NodeKey | null;
    setSelectedCardKey: React.Dispatch<React.SetStateAction<NodeKey | null>>;
    isEditingCard: boolean;
    setIsEditingCard: React.Dispatch<React.SetStateAction<boolean>>;
    isDragging: boolean;
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
    showVisibilitySettings: boolean;
    setShowVisibilitySettings: React.Dispatch<React.SetStateAction<boolean>>;
}

const noop = () => {};

const Context = React.createContext<KoenigSelectedCardContextValue>({
    selectedCardKey: null,
    setSelectedCardKey: noop,
    isEditingCard: false,
    setIsEditingCard: noop,
    isDragging: false,
    setIsDragging: noop,
    showVisibilitySettings: false,
    setShowVisibilitySettings: noop
});

export const KoenigSelectedCardContext = ({children}: {children: React.ReactNode}) => {
    const [selectedCardKey, setSelectedCardKey] = React.useState<NodeKey | null>(null);
    const [isEditingCard, setIsEditingCard] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [showVisibilitySettings, setShowVisibilitySettings] = React.useState(false);
    const contextValue = React.useMemo(() => {
        return {
            selectedCardKey,
            setSelectedCardKey,
            isEditingCard,
            setIsEditingCard,
            isDragging,
            setIsDragging,
            showVisibilitySettings,
            setShowVisibilitySettings
        };
    }, [
        selectedCardKey,
        setSelectedCardKey,
        isEditingCard,
        setIsEditingCard,
        isDragging,
        setIsDragging,
        showVisibilitySettings,
        setShowVisibilitySettings
    ]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useKoenigSelectedCardContext = () => React.useContext(Context);
