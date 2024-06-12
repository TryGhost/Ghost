import React from 'react';

export const INPUT_CLASSES = 'rounded-md border border-grey-300 py-2 px-3 font-sans text-sm font-normal text-grey-900 focus:border-green focus:shadow-insetgreen focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-700 dark:selection:bg-grey-800';

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
            shouldFocusOnUpdate.current = false;
            const timeoutId = setTimeout(() => {
                if (inputRef.current) {
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
