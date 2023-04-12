import React from 'react';

const Context = React.createContext({});

export const KoenigSelectedCardContext = ({children}) => {
    const [selectedCardKey, setSelectedCardKey] = React.useState(null);
    const [isEditingCard, setIsEditingCard] = React.useState(false);

    const contextValue = React.useMemo(() => {
        return {
            selectedCardKey,
            setSelectedCardKey,
            isEditingCard,
            setIsEditingCard
        };
    }, [selectedCardKey, setSelectedCardKey, isEditingCard, setIsEditingCard]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useKoenigSelectedCardContext = () => React.useContext(Context);
