import React from 'react';

const Context = React.createContext({});

export const KoenigSelectedCardContext = ({children}) => {
    const [selectedCardKey, setSelectedCardKey] = React.useState(null);
    const [isEditingCard, _setIsEditingCard] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    // when true, the card's settings panel opens on its Visibility tab
    const [showVisibilitySettings, setShowVisibilitySettings] = React.useState(false);

    // leaving edit mode always resets the panel, so the next Edit opens on the first tab
    const setIsEditingCard = React.useCallback((isEditing) => {
        if (!isEditing) {
            setShowVisibilitySettings(false);
        }
        _setIsEditingCard(isEditing);
    }, []);
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
