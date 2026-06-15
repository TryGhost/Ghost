import QuoteReplyIcon from '../../../images/icons/quote-reply.svg?react';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {QuoteSelection} from '../hooks/use-quote-selection';
import {useAppContext} from '../../../app-context';

type QuoteButtonPlacement = 'selection' | 'gutter';

type QuoteButtonPosition = {
    left: number;
    top: number;
    placement: QuoteButtonPlacement;
};

type Props = {
    quoteSelection: QuoteSelection;
    quoteInReply: (quoteHtml?: string) => void;
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
        top: Math.max(quoteSelection.top, size.height + verticalMargin),
        placement: 'selection' as QuoteButtonPlacement
    };
}

function isMobileQuoteButton(ownerWindow: Window) {
    return ownerWindow.matchMedia('(max-width: 480px)').matches;
}

function getGutterPosition(ownerWindow: Window, quoteSelection: QuoteSelection) {
    const size = 32;
    const gap = 8;
    const verticalMargin = 4;
    const left = quoteSelection.textLeft - size - gap;
    const top = quoteSelection.centerTop - (size / 2);

    return {
        left: Math.max(left, 0),
        top: Math.min(Math.max(top, verticalMargin), ownerWindow.innerHeight - size - verticalMargin),
        placement: 'gutter' as QuoteButtonPlacement
    };
}

function getPosition(ownerWindow: Window, size: {width: number, height: number}, quoteSelection: QuoteSelection) {
    return isMobileQuoteButton(ownerWindow)
        ? getGutterPosition(ownerWindow, quoteSelection)
        : getClampedPosition(ownerWindow, size, quoteSelection);
}

function suppressCompatibilityClick(ownerDocument: Document, onCleanup: () => void) {
    const ownerWindow = ownerDocument.defaultView || window;
    let timeout: number | null = null;
    let cleanedUp = false;

    function cleanup() {
        if (cleanedUp) {
            return;
        }

        cleanedUp = true;
        ownerDocument.removeEventListener('click', stopClick, true);
        onCleanup();
    }

    function stopClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (timeout !== null) {
            ownerWindow.clearTimeout(timeout);
        }

        cleanup();
    }

    ownerDocument.addEventListener('click', stopClick, true);
    timeout = ownerWindow.setTimeout(cleanup, 700);
}

const QuoteReplyButton: React.FC<Props> = ({quoteSelection, quoteInReply}) => {
    const {t} = useAppContext();
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const handledTouchRef = useRef(false);
    // The button's label never changes, so measure it once instead of forcing a
    // synchronous layout on every selection/scroll tick.
    const sizeRef = useRef<{width: number, height: number} | null>(null);
    const [position, setPosition] = useState<QuoteButtonPosition>(() => ({
        left: quoteSelection.left,
        top: quoteSelection.top,
        placement: 'selection'
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
        const updatePosition = () => {
            const next = getPosition(ownerWindow, sizeRef.current!, quoteSelection);
            setPosition(previous => (
                previous.left === next.left && previous.top === next.top && previous.placement === next.placement ? previous : next
            ));
        };

        updatePosition();

        ownerWindow.addEventListener('resize', updatePosition);
        ownerWindow.addEventListener('scroll', updatePosition, true);

        return () => {
            ownerWindow.removeEventListener('resize', updatePosition);
            ownerWindow.removeEventListener('scroll', updatePosition, true);
        };
    }, [quoteSelection]);

    const isGutterButton = position.placement === 'gutter';

    return (
        <button
            ref={buttonRef}
            aria-label={isGutterButton ? t('Quote in reply') : undefined}
            className={`fixed z-50 bg-neutral-900 font-sans text-sm font-semibold leading-none text-white shadow-lg transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 ${isGutterButton ? 'flex size-8 items-center justify-center rounded-full p-0' : 'whitespace-nowrap rounded-md px-3 py-2'}`}
            data-placement={position.placement}
            data-testid="quote-reply-button"
            style={{
                left: position.left,
                top: position.top,
                transform: isGutterButton ? 'none' : 'translate(-50%, -100%)'
            }}
            type="button"
            onClick={(event) => {
                if (handledTouchRef.current) {
                    handledTouchRef.current = false;
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                quoteInReply(quoteSelection.html);
            }}
            onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onTouchEnd={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onTouchStart={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handledTouchRef.current = true;
                suppressCompatibilityClick(event.currentTarget.ownerDocument, () => {
                    handledTouchRef.current = false;
                });
                quoteInReply(quoteSelection.html);
            }}
        >
            {isGutterButton ? <QuoteReplyIcon className="size-[18px]" aria-hidden /> : t('Quote in reply')}
        </button>
    );
};

export default QuoteReplyButton;
