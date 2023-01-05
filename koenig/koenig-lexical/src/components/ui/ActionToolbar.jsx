import React from 'react';

export function ActionToolbar({isVisible, children, ...props}) {
    if (isVisible) {
        return (
            <div className="not-kg-prose absolute top-[-44px] left-1/2 z-[1000] -translate-x-1/2" {...props}>
                {children}
            </div>
        );
    }
}
