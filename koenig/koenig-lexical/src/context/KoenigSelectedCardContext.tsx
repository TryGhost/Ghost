import React from 'react';

interface KoenigSelectedCardContextType {
    selectedCardKey: string | null;
    setSelectedCardKey: (value: string | null) => void;
    isEditingCard: boolean;
    setIsEditingCard: (value: boolean) => void;
    isDragging: boolean;
    setIsDragging: (value: boolean) => void;
    showVisibilitySettings: boolean;
    setShowVisibilitySettings: (value: boolean) => void;
}

const noop = () => {};

const Context = React.createContext<KoenigSelectedCardContextType>({
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
    const [selectedCardKey, setSelectedCardKey] = React.useState<string | null>(null);
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
