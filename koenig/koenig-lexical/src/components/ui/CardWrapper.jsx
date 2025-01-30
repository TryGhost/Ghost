import PropTypes from 'prop-types';
import React from 'react';
import VisibilityIndicator from '../../assets/icons/kg-indicator-visibility.svg?react';

const CARD_WIDTH_CLASSES = {
    wide: [
        'w-[calc(75vw-var(--kg-breakout-adjustment-with-fallback)+2px)] mx-[calc(50%-(50vw-var(--kg-breakout-adjustment-with-fallback))-.8rem)] min-w-[calc(100%+3.6rem)] translate-x-[calc(50vw-50%+.8rem-var(--kg-breakout-adjustment-with-fallback))]',
        'md:min-w-[calc(100%+10rem)]',
        'lg:min-w-[calc(100%+18rem)]'
    ].join(' '),
    full: 'inset-x-[-1px] mx-[calc(50%-50vw)] w-[calc(100vw+2px)] lg:mx-[calc(50%-50vw+(var(--kg-breakout-adjustment-with-fallback)/2))] lg:w-[calc(100vw-var(--kg-breakout-adjustment-with-fallback)+2px)]'
};

const DEFAULT_INDICATOR_POSITION = {
    top: '.6rem'
};

export const CardWrapper = React.forwardRef(({
    cardType,
    cardWidth,
    feature,
    IndicatorIcon,
    indicatorPosition,
    isDragging,
    isEditing,
    isSelected,
    isVisibilityActive,
    onIndicatorClick,
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
        isSelected ? 'z-20' : 'z-10', // ensure setting panels sit above other cards
        isSelected && !isDragging ? 'shadow-[0_0_0_2px] shadow-green' : '',
        !isSelected && !isDragging ? 'hover:shadow-[0_0_0_1px] hover:shadow-green' : '',
        CARD_WIDTH_CLASSES[cardWidth] || '',
        wrapperClass()
    ].join(' ');

    const position = {
        ...DEFAULT_INDICATOR_POSITION,
        ...(indicatorPosition || {})
    };

    let indicatorIcon;
    if (feature?.contentVisibilityAlpha && isVisibilityActive) {
        indicatorIcon = (
            <div className="sticky top-0 lg:top-8">
                <VisibilityIndicator
                    aria-label="Card is hidden for select audiences"
                    className="absolute left-[-6rem] size-5 cursor-pointer text-grey"
                    data-testid="visibility-indicator"
                    style={{
                        left: position.left,
                        top: position.top
                    }}
                    onClick={onIndicatorClick}
                />
            </div>
        );
    } else if (IndicatorIcon) {
        indicatorIcon = (
            <div className="sticky top-0 lg:top-8">
                <IndicatorIcon
                    aria-label={`${cardType} indicator`}
                    className="absolute left-[-6rem] size-5 text-grey"
                    style={{
                        left: position.left,
                        top: position.top
                    }}
                />
            </div>
        );
    }

    return (
        <>
            {indicatorIcon}
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
    icon: PropTypes.string,
    indicatorPosition: PropTypes.shape({
        left: PropTypes.string,
        top: PropTypes.string
    })
};

CardWrapper.defaultProps = {
    cardWidth: 'regular',
    indicatorPosition: DEFAULT_INDICATOR_POSITION
};
