import React from 'react';
import PropTypes from 'prop-types';

export const CardWrapper = React.forwardRef(({isSelected, breakout, cardType, children, ...props}, ref) => {
    return (
        <div
            className={`relative border border-transparent caret-grey-800 ${isSelected ? 'shadow-[0_0_0_2px] shadow-green' : 'hover:shadow-[0_0_0_1px] hover:shadow-green'} ${(breakout === 'wide') ? 'mx-[calc(50%-(50vw-.8rem)] w-[calc(65vw+2px)] min-w-[calc(100%+3.6rem)] sm:min-w-[calc(100%+10rem)] lg:min-w-[calc(100%+18rem)] translate-x-[calc(50vw-50%+.8rem)]' : (breakout === 'full') ? 'mx-[calc(50%-50vw)] w-[100vw]' : ''}`}
            ref={ref}
            data-kg-card={cardType}
            data-kg-card-selected={isSelected}
            {...props}
        >
            {children}
        </div>
    );
});

CardWrapper.propTypes = {
    isSelected: PropTypes.bool,
    breakout: PropTypes.oneOf(['regular', 'wide', 'full'])
};

CardWrapper.defaultProps = {
    breakout: 'regular'
};