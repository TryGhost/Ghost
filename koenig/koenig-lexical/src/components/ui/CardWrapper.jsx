import PropTypes from 'prop-types';
import React from 'react';

const CARD_WIDTH_CLASSES = {
    wide: [
        'w-[calc(75vw-var(--kg-breakout-adjustment-with-fallback)+2px)] mx-[calc(50%-(50vw-var(--kg-breakout-adjustment-with-fallback))-.8rem)] min-w-[calc(100%+3.6rem)] translate-x-[calc(50vw-50%+.8rem-var(--kg-breakout-adjustment-with-fallback))]',
        'sm:min-w-[calc(100%+10rem)]',
        'lg:min-w-[calc(100%+18rem)]'
    ].join(' '),
    full: 'inset-x-[-1px] mx-[calc(50%-50vw)] w-[calc(100vw+2px)] lg:mx-[calc(50%-50vw+(var(--kg-breakout-adjustment-with-fallback)/2))] lg:w-[calc(100vw-var(--kg-breakout-adjustment-with-fallback)+2px)]'
};

export const CardWrapper = React.forwardRef(({
    cardType,
    cardWidth,
    IndicatorIcon,
    isDragging,
    isEditing,
    isSelected,
    onClick,
    wrapperStyle,
    children,
    ...props
}, ref) => {
    const wrapperClass = () => {
        if ((wrapperStyle === 'wide') && (isEditing || isSelected)) {
            return '!-mx-3 !px-3';
        } else if (((wrapperStyle === 'code-card') && isEditing)) {
            return '-mx-6';
        } else if (wrapperStyle === 'wide') {
            return 'hover:-mx-3 hover:px-3';
        } else {
            return 'border';
        }
    };

    const className = [
        'relative border-transparent caret-grey-800',
        isSelected ? 'z-20' : '', // ensure setting panels sit above other cards
        isSelected && !isDragging ? 'shadow-[0_0_0_2px] shadow-green' : '',
        !isSelected && !isDragging ? 'hover:shadow-[0_0_0_1px] hover:shadow-green' : '',
        CARD_WIDTH_CLASSES[cardWidth] || '',
        wrapperClass()
    ].join(' ');

    return (
        <>
            {IndicatorIcon &&
                <div className="sticky top-0">
                    <IndicatorIcon className="absolute left-[-6rem] top-[.6rem] size-6 text-grey" />
                </div>
            }
            <div
                ref={ref}
                className={className}
                data-kg-card={cardType}
                data-kg-card-editing={isEditing}
                data-kg-card-selected={isSelected}
                {...props}
            >
                {children}
            </div>
        </>
    );
});

CardWrapper.displayName = 'CardWrapper';

CardWrapper.propTypes = {
    isSelected: PropTypes.bool,
    isEditing: PropTypes.bool,
    cardWidth: PropTypes.oneOf(['regular', 'wide', 'full']),
    icon: PropTypes.string
};

CardWrapper.defaultProps = {
    cardWidth: 'regular'
};
