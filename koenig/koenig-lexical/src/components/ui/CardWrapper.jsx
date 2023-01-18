import React from 'react';
import PropTypes from 'prop-types';

export const CardWrapper = React.forwardRef(({isSelected, isEditing, cardWidth, cardType, wrapperStyle, children, ...props}, ref) => {
    return (
        <div
            className={`relative border border-transparent caret-grey-800 ${isSelected ? 'shadow-[0_0_0_2px] shadow-green' : 'hover:shadow-[0_0_0_1px] hover:shadow-green'} ${(cardWidth === 'wide') ? 'mx-[calc(50%-(50vw-var(--kg-breakout-adjustment))-.8rem)] w-[calc(65vw+2px-var(--kg-breakout-adjustment))] min-w-[calc(100%+3.6rem)] translate-x-[calc(50vw-50%+.8rem-var(--kg-breakout-adjustment))] sm:min-w-[calc(100%+10rem)] lg:min-w-[calc(100%+18rem)]' : (cardWidth === 'full') ? 'lg:mx-[calc(50%-50vw+(var(--kg-breakout-adjustment)/2))] lg:w-[calc(100vw-var(--kg-breakout-adjustment))]' : ''} ${((wrapperStyle === 'wide') && (isEditing || isSelected)) ? '-mx-3 px-3' : ((wrapperStyle === 'code-card') && isEditing) ? '-mx-6' : ''}`}
            ref={ref}
            data-kg-card={cardType}
            data-kg-card-selected={isSelected}
            data-kg-card-editing={isEditing}
            {...props}
        >
            {children}
        </div>
    );
});

CardWrapper.propTypes = {
    isSelected: PropTypes.bool,
    isEditing: PropTypes.bool,
    cardWidth: PropTypes.oneOf(['regular', 'wide', 'full'])
};

CardWrapper.defaultProps = {
    cardWidth: 'regular'
};
