import {useRef} from 'react';

export const usePreviousFocus = (onClick, name) => {
    const previousRangeRef = useRef(null);

    const handleMousedown = () => {
        const selection = document.getSelection();
        previousRangeRef.current = (selection.rangeCount === 0 ? null : selection.getRangeAt(0));
    };

    const handleClick = (e) => {
        e.preventDefault();
        onClick(name);

        if (previousRangeRef.current) {
            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(previousRangeRef.current);
            previousRangeRef.current = null;
        }
    };

    return {handleMousedown, handleClick};
};
