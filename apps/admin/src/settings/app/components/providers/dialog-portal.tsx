import React, {createContext, useContext, useState} from 'react';
import {createPortal} from 'react-dom';

const DialogPortalContext = createContext<HTMLElement | null>(null);

// Settings groups and the fixed content wrapper open stacking contexts, so an in-tree
// SettingsModal paints below the settings chrome; the host sits beside the layout instead.
export const DialogPortalProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [host, setHost] = useState<HTMLElement | null>(null);

    return (
        <DialogPortalContext.Provider value={host}>
            {children}
            <div ref={setHost} />
        </DialogPortalContext.Provider>
    );
};

export const DialogPortal: React.FC<{children: React.ReactNode}> = ({children}) => {
    const host = useContext(DialogPortalContext);

    if (!host) {
        return null;
    }

    return createPortal(children, host);
};
