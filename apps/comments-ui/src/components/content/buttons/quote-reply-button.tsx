import React, {useLayoutEffect, useRef, useState} from 'react';
import {QuoteSelection} from '../hooks/use-quote-selection';
import {useAppContext} from '../../../app-context';

type Props = {
    quoteSelection: QuoteSelection;
    quoteInReply: () => void;
};

function getClampedPosition(ownerWindow: Window, size: {width: number, height: number}, quoteSelection: QuoteSelection) {
    const horizontalMargin = 8;
    const verticalMargin = 8;
    const halfWidth = size.width / 2;

    return {
        left: Math.min(
            Math.max(quoteSelection.left, halfWidth + horizontalMargin),
            ownerWindow.innerWidth - halfWidth - horizontalMargin
        ),
        top: Math.max(quoteSelection.top, size.height + verticalMargin)
    };
}

const QuoteReplyButton: React.FC<Props> = ({quoteSelection, quoteInReply}) => {
    const {t} = useAppContext();
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    // The button's label never changes, so measure it once instead of forcing a
    // synchronous layout on every selection/scroll tick.
    const sizeRef = useRef<{width: number, height: number} | null>(null);
    const [position, setPosition] = useState(() => ({
        left: quoteSelection.left,
        top: quoteSelection.top
    }));

    useLayoutEffect(() => {
        const button = buttonRef.current;

        if (!button) {
            return;
        }

        if (!sizeRef.current) {
            const {width, height} = button.getBoundingClientRect();
            sizeRef.current = {width, height};
        }

        const ownerWindow = button.ownerDocument.defaultView || window;
        const next = getClampedPosition(ownerWindow, sizeRef.current, quoteSelection);
        setPosition(previous => (
            previous.left === next.left && previous.top === next.top ? previous : next
        ));
    }, [quoteSelection]);

    return (
        <button
            ref={buttonRef}
            className="fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-neutral-900 px-3 py-2 font-sans text-sm font-semibold leading-none text-white shadow-lg transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            data-testid="quote-reply-button"
            style={{
                left: position.left,
                top: position.top
            }}
            type="button"
            onClick={quoteInReply}
            onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onTouchEnd={(event) => {
                event.preventDefault();
                event.stopPropagation();
                quoteInReply();
            }}
            onTouchStart={(event) => {
                event.stopPropagation();
            }}
        >
            {t('Quote in reply')}
        </button>
    );
};

export default QuoteReplyButton;
