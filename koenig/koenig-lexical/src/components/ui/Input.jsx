import React from 'react';

export const INPUT_CLASSES = 'rounded border border-grey-300 py-2 px-3 font-sans text-sm font-normal text-grey-900 focus:border-green focus:shadow-insetgreen focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-700 dark:selection:bg-grey-800';

export function Input({dataTestId, value, placeholder, onChange, onFocus, onBlur}) {
    const onChangeWrapper = (e) => {
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <>
            <div className="relative">
                <input
                    className={`relative w-full ${INPUT_CLASSES}`}
                    data-testid={dataTestId}
                    defaultValue={value}
                    placeholder={placeholder}
                    onBlur={onBlur}
                    onChange={onChangeWrapper}
                    onFocus={onFocus}
                />
            </div>
        </>
    );
}
