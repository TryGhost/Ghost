import React from 'react';

const Context = React.createContext({});

export const KoenigSelectedCardContext = ({children}) => {
    const [selectedCardKey, setSelectedCardKey] = React.useState(null);
    const [isEditingCard, _setIsEditingCard] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    // when true, the card's settings panel opens on its Visibility tab
    const [showVisibilitySettings, _setShowVisibilitySettings] = React.useState(false);
    const [visibilitySettingsRequestId, setVisibilitySettingsRequestId] = React.useState(0);

    const setShowVisibilitySettings = React.useCallback((show) => {
        // Every indicator click is a new request, even if the panel is already open.
        if (show) {
            setVisibilitySettingsRequestId(requestId => requestId + 1);
        }
        _setShowVisibilitySettings(show);
    }, []);

    // leaving edit mode always resets the panel, so the next Edit opens on the first tab
    const setIsEditingCard = React.useCallback((isEditing) => {
        if (!isEditing) {
            setShowVisibilitySettings(false);
        }
        _setIsEditingCard(isEditing);
    }, [setShowVisibilitySettings]);
    const contextValue = React.useMemo(() => {
        return {
            selectedCardKey,
            setSelectedCardKey,
            isEditingCard,
            setIsEditingCard,
            isDragging,
            setIsDragging,
            showVisibilitySettings,
            visibilitySettingsRequestId,
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
        visibilitySettingsRequestId,
        setShowVisibilitySettings
    ]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useKoenigSelectedCardContext = () => React.useContext(Context);
