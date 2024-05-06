import React from 'react';

export const INPUT_CLASSES = 'rounded-md border border-grey-300 py-2 px-3 font-sans text-sm font-normal text-grey-900 focus:border-green focus:shadow-insetgreen focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-700 dark:selection:bg-grey-800';

export function Input({className, dataTestId, value, onChange, ...props}) {
    const [localValue, setLocalValue] = React.useState(value);

    const onChangeWrapper = React.useCallback((e) => {
        setLocalValue(e.target.value);

        if (onChange) {
            onChange(e);
        }
    }, [onChange]);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <>
            <div className="relative">
                <input
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
