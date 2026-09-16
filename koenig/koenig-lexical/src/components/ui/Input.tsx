import React from 'react';

export const INPUT_CLASSES = 'h-9 rounded-lg border border-grey-100 bg-grey-100 dark:bg-grey-900 dark:border-transparent dark:focus:border-green dark:hover:bg-grey-925 dark:focus:bg-grey-925 transition-colors px-3 py-1.5 font-sans text-sm font-normal text-grey-900 focus:border-green focus:bg-white focus:shadow-[0_0_0_2px_rgba(48,207,67,.25)] focus-visible:outline-none dark:text-white dark:selection:bg-grey-800 placeholder:text-grey-500 md:h-[38px] md:py-2 dark:placeholder:text-grey-700';

export function Input({autoFocus, className, dataTestId, value, onChange, ...props}) {
    const inputRef = React.useRef(null);
    const shouldFocusOnUpdate = React.useRef(autoFocus);
    const [localValue, setLocalValue] = React.useState(value);

    const onChangeWrapper = React.useCallback((e) => {
        setLocalValue(e.target.value);

        if (onChange) {
            onChange(e);
        }
    }, [onChange]);

    React.useEffect(() => {
        setLocalValue(value);

        // setting a value via state immediately after mounting results in React's
        // autoFocus not working, so we need to manually focus the input
        if (shouldFocusOnUpdate.current) {
            const timeoutId = setTimeout(() => {
                if (inputRef.current) {
                    shouldFocusOnUpdate.current = false;
                    inputRef.current.focus();
                }
            }, 0);

            // Cleanup
            return () => clearTimeout(timeoutId);
        }
    }, [value]);

    return (
        <>
            <div className="relative">
                <input
                    ref={inputRef}
                    autoFocus={autoFocus}
                    className={`relative w-full ${className || INPUT_CLASSES}`}
                    data-testid={dataTestId}
                    value={localValue}
                    onChange={onChangeWrapper}
                    {...props}
                />
            </div>
        </>
    );
}
