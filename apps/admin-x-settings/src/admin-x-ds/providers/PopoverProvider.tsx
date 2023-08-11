import React, {createContext, useContext, useState} from 'react';

interface PopoverContextProps {
    open: boolean;
    positionX: number;
    positionY: number;
    openPopover: (x: number, y: number, contents: React.ReactNode) => void;
    closePopover: () => void;
    contents: React.ReactNode;
}

const PopoverContext = createContext<PopoverContextProps | undefined>(undefined);

export const usePopover = () => {
    const context = useContext(PopoverContext);
    if (!context) {
        throw new Error('usePopover must be used within a PopoverProvider');
    }
    return context;
};

interface PopoverProviderProps {
    children: React.ReactNode;
}

export const PopoverProvider: React.FC<PopoverProviderProps> = ({
    children
}) => {
    const [open, setOpen] = useState(false);
    const [contents, setContents] = useState<React.ReactNode>(<></>);
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);

    const openPopover = (x: number, y: number, c: React.ReactNode) => {
        setOpen(true);
        setPositionX(x);
        setPositionY(y);
        setContents(c);
    };

    const closePopover = () => {
        setOpen(false);
    };

    const contextValue: PopoverContextProps = {
        open,
        positionX,
        positionY,
        openPopover,
        closePopover,
        contents
    };

    return (
        <PopoverContext.Provider value={contextValue}>
            {children}
        </PopoverContext.Provider>
    );
};