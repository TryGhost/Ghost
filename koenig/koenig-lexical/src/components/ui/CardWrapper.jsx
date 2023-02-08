import React from 'react';
import PropTypes from 'prop-types';

export const CardWrapper = React.forwardRef(({isSelected, isEditing, cardWidth, cardType, wrapperStyle, IndicatorIcon, children, ...props}, ref) => {
    return (
        <>
            {IndicatorIcon &&
                <div className="sticky top-6 mb-6">
                    <IndicatorIcon className="absolute left-[-6rem] top-[.6rem] h-6 w-6 text-grey" />
                </div>
            }
            <div
                className={`relative border-transparent caret-grey-800 ${isSelected ? 'shadow-[0_0_0_2px] shadow-green' : 'hover:shadow-[0_0_0_1px] hover:shadow-green'} ${(cardWidth === 'wide') ? 'mx-[calc(50%-(50vw-var(--kg-breakout-adjustment))-.8rem)] w-[calc(65vw+2px-var(--kg-breakout-adjustment))] min-w-[calc(100%+3.6rem)] translate-x-[calc(50vw-50%+.8rem-var(--kg-breakout-adjustment))] sm:min-w-[calc(100%+10rem)] lg:min-w-[calc(100%+18rem)]' : (cardWidth === 'full') ? 'inset-x-[-1px] mx-[calc(50%-50vw+(var(--kg-breakout-adjustment)/2))] w-[calc(100vw-var(--kg-breakout-adjustment)+2px)]' : ''} ${((wrapperStyle === 'wide') && (isEditing || isSelected)) ? '-mx-3 px-3' : ((wrapperStyle === 'code-card') && isEditing) ? '-mx-6' : ''} ${(wrapperStyle === 'wide') ? 'hover:-mx-3 hover:px-3' : 'border'}`}
                ref={ref}
                data-kg-card={cardType}
                data-kg-card-selected={isSelected}
                data-kg-card-editing={isEditing}
                {...props}
            >
                {children}
            </div>
        </>
    );
});

CardWrapper.propTypes = {
    isSelected: PropTypes.bool,
    isEditing: PropTypes.bool,
    cardWidth: PropTypes.oneOf(['regular', 'wide', 'full']),
    icon: PropTypes.string
};

CardWrapper.defaultProps = {
    cardWidth: 'regular'
};
