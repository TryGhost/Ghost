import React from 'react';

interface SlashMenuProps {
    children?: React.ReactNode;
}

export function SlashMenu({children}: SlashMenuProps) {
    return (
        <div data-kg-slash-menu>
            {children}
        </div>
    );
}
