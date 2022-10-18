import React from 'react';

export const CardWrapper = React.forwardRef(({isSelected, cardType, children, ...props}, ref) => {
    return (
        <div
            className={`relative border border-transparent caret-grey-800 ${isSelected ? 'shadow-[0_0_0_2px] shadow-green' : 'hover:shadow-[0_0_0_1px] hover:shadow-green'}`}
            ref={ref}
            data-kg-card={cardType}
            data-kg-card-selected={isSelected}
            {...props}
        >
            {children}
        </div>
    );
});
