import React from 'react';
import type {NodeKey} from 'lexical';

export interface KoenigSelectedCardContextValue {
    selectedCardKey: NodeKey | null;
    setSelectedCardKey: React.Dispatch<React.SetStateAction<NodeKey | null>>;
    isEditingCard: boolean;
    setIsEditingCard: (isEditing: boolean) => void;
    isDragging: boolean;
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
    showVisibilitySettings: boolean;
    visibilitySettingsRequestId: number;
    setShowVisibilitySettings: (show: boolean) => void;
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
    visibilitySettingsRequestId: 0,
    setShowVisibilitySettings: noop
});

export const KoenigSelectedCardContext = ({children}: {children: React.ReactNode}) => {
    const [selectedCardKey, setSelectedCardKey] = React.useState<NodeKey | null>(null);
    const [isEditingCard, _setIsEditingCard] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    // when true, the card's settings panel opens on its Visibility tab
    const [showVisibilitySettings, _setShowVisibilitySettings] = React.useState(false);
    const [visibilitySettingsRequestId, setVisibilitySettingsRequestId] = React.useState(0);

    const setShowVisibilitySettings = React.useCallback((show: boolean) => {
        // Every indicator click is a new request, even if the panel is already open.
        if (show) {
            setVisibilitySettingsRequestId(requestId => requestId + 1);
        }
        _setShowVisibilitySettings(show);
    }, []);

    // leaving edit mode always resets the panel, so the next Edit opens on the first tab
    const setIsEditingCard = React.useCallback((isEditing: boolean) => {
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
