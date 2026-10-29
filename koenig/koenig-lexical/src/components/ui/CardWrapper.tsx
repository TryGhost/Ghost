import React from 'react';
import VisibilityIndicator from '../../assets/icons/kg-indicator-visibility.svg?react';
import type {CardWidth} from '@tryghost/kg-default-nodes';

const CARD_WIDTH_CLASSES: Partial<Record<CardWidth, string>> = {
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

interface CardWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    cardType?: string | null;
    cardWidth?: CardWidth;
    feature?: unknown;
    IndicatorIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    indicatorPosition?: {left?: string; top?: string};
    isDragging?: boolean;
    isEditing?: boolean;
    isSelected?: boolean;
    isVisibilityActive?: boolean;
    onIndicatorClick?: (event: React.MouseEvent) => void;
    wrapperStyle?: string;
}

export const CardWrapper = React.forwardRef<HTMLDivElement, CardWrapperProps>(({
    cardType,
    cardWidth = 'regular',
    feature: _feature,
    IndicatorIcon,
    indicatorPosition = DEFAULT_INDICATOR_POSITION,
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

    const position: {left?: string; top?: string} = {
        ...DEFAULT_INDICATOR_POSITION,
        ...(indicatorPosition || {}),
        ...(cardType === 'call-to-action' && {top: '1.4rem'})
    };

    // a wide or full-width card covers the margin, so its visibility indicator
    // sits inside the card instead, following the page while it scrolls
    const isBreakoutCard = cardWidth === 'wide' || cardWidth === 'full';
    const showInsideIndicator = isVisibilityActive && isBreakoutCard;

    // keep the inside indicator over the media itself, clear of any space
    // above it and of the caption below it
    const cardRef = React.useRef<HTMLDivElement | null>(null);
    const [mediaInsets, setMediaInsets] = React.useState({top: 0, bottom: 0});
    React.useLayoutEffect(() => {
        const card = cardRef.current;
        if (!showInsideIndicator || !card) {
            return;
        }

        const measure = () => {
            const figure = card.querySelector('figure');
            const media = figure?.querySelector('img') ?? figure?.firstElementChild;
            if (!media) {
                return;
            }
            const cardRect = card.getBoundingClientRect();
            // the figure's first child holds all the media, e.g. every row of a gallery
            const mediaBottom = figure.querySelector('figcaption')?.getBoundingClientRect().top ?? (figure.firstElementChild ?? media).getBoundingClientRect().bottom;
            // insets are measured inside the card's border, where the indicator is positioned
            const border = card.clientTop;
            setMediaInsets({top: media.getBoundingClientRect().top - cardRect.top - border, bottom: cardRect.bottom - mediaBottom - border});
        };
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(card);
        return () => observer.disconnect();
    }, [showInsideIndicator]);

    const setRefs = (node: HTMLDivElement | null) => {
        cardRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
    };

    let indicatorIcon;
    let insideIndicatorIcon;
    if (showInsideIndicator) {
        insideIndicatorIcon = (
            <div className="pointer-events-none absolute inset-x-0 z-50" style={mediaInsets}>
                {/* the host can set --kg-indicator-sticky-top to keep the indicator clear of its own header */}
                <div className="sticky top-[calc(var(--kg-indicator-sticky-top,theme(spacing.4))-theme(spacing.4))] p-4">
                    <button
                        aria-label="Card is hidden for select audiences"
                        className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-white/80 text-grey-900 backdrop-blur-sm dark:bg-grey-950/80 dark:text-grey-100"
                        data-testid="visibility-indicator"
                        type="button"
                        onClick={onIndicatorClick}
                    >
                        <VisibilityIndicator className="size-4" />
                    </button>
                </div>
            </div>
        );
    } else if (isVisibilityActive) {
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
                ref={setRefs}
                className={className}
                data-kg-card={cardType}
                data-kg-card-editing={isEditing}
                data-kg-card-selected={isSelected}
                {...props}
            >
                {children}
                {/* after the card's content, so it doesn't add spacing before the figure */}
                {insideIndicatorIcon}
            </div>
        </>
    );
});

CardWrapper.displayName = 'CardWrapper';
