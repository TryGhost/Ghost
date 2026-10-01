import CardContext from '../../../../context/CardContext';
import React from 'react';
import StarIcon from '../../../../assets/icons/kg-star.svg?react';

export function RatingButton({rating, onRatingChange}) {
    const {readOnly} = React.useContext(CardContext);
    const Star = readOnly ? 'span' : 'button';
    const [hoveredStarIndex, setHoveredStarIndex] = React.useState(-1);

    const resetHoveredStarIndex = () => {
        setHoveredStarIndex(-1);
    };

    const getStyles = (index) => {
        const styles = {
            active: rating >= (index + 1) ? 'fill-grey-900 dark:fill-white' : 'fill-grey-200 dark:fill-grey-900',
            hovered: !readOnly && hoveredStarIndex >= index ? 'opacity-70' : ''
        };

        return Object.values(styles).join(' ');
    };

    return (
        <div
            className="not-kg-prose ml-auto flex transition-all duration-75"
            data-testid="product-stars"
            onMouseLeave={resetHoveredStarIndex}
        >
            {
                [...Array(5).keys()].map((star, i) => (
                    <Star
                        key={star}
                        className={`flex h-7 w-5 ${readOnly ? '' : 'cursor-pointer'} items-center justify-center ${getStyles(i)}`}
                        type={readOnly ? undefined : 'button'}
                        onClick={readOnly ? undefined : () => onRatingChange(i + 1)}
                        onMouseOver={readOnly ? undefined : () => setHoveredStarIndex(i)}
                    >
                        <StarIcon className="w-4" />
                    </Star>
                ))
            }
        </div>
    );
}
