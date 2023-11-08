import React, {useEffect, useRef} from 'react';

export interface InfiniteScrollListenerProps {
    /** How many pixels before the end of the container the callback should trigger */
    offset: number;
    onTrigger: () => void;
}

/**
 * Triggers a callback when the user scrolls close to the end of an element
 * (exactly how close is configurable with `offset`). The parent element must have
 * position: relative/absolute/etc.
 */
const InfiniteScrollListener: React.FC<InfiniteScrollListenerProps> = ({offset, onTrigger}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const intersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].intersectionRatio <= 0) {
                return;
            }
            onTrigger();
        });

        if (ref.current) {
            intersectionObserver.observe(ref.current);
        }

        return () => intersectionObserver.disconnect();
    }, [onTrigger]);

    return <div ref={ref} className="absolute w-full" style={{bottom: offset}} />;
};

export default InfiniteScrollListener;
