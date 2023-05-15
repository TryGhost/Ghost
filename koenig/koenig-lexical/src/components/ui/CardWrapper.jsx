import PropTypes from 'prop-types';
import React from 'react';

const CARD_WIDTH_CLASSES = {
    wide: [
        'w-[calc(100%+3.6rem)] left-[calc(50%-(100%+3.6rem)/2)]',
        'sm:w-[calc(100%+10rem)] sm:left-[calc(50%-(100%+10rem)/2)]',
        'lg:w-[calc(100%+18rem)] lg:left-[calc(50%-(100%+18rem)/2)]'
    ].join(' '),
    full: 'inset-x-[-1px] mx-[calc(50%-50vw+(var(--kg-breakout-adjustment)/2))] w-[calc(100vw-var(--kg-breakout-adjustment)+2px)]'
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
        isSelected && !isDragging ? 'shadow-[0_0_0_2px] shadow-green' : '',
        !isSelected && !isDragging ? 'hover:shadow-[0_0_0_1px] hover:shadow-green' : '',
        CARD_WIDTH_CLASSES[cardWidth] || '',
        wrapperClass()
    ].join(' ');

    return (
        <>
            {IndicatorIcon &&
                <div className="sticky top-6 mb-6">
                    <IndicatorIcon className="absolute left-[-6rem] top-[.6rem] h-6 w-6 text-grey" />
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
