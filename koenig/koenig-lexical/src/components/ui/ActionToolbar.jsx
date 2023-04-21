import React from 'react';
import {useKoenigSelectedCardContext} from '../../context/KoenigSelectedCardContext';

export function ActionToolbar({isVisible, children, ...props}) {
    const {isDragging} = useKoenigSelectedCardContext();

    if (isVisible && !isDragging) {
        return (
            <div className="not-kg-prose absolute top-[-44px] left-1/2 z-[1000] -translate-x-1/2" {...props}>
                {children}
            </div>
        );
    }
}
