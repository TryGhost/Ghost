import React from 'react';
import useInputSelection from '../../hooks/useInputSelection';

export function Input({dataTestId, value, placeholder, onChange, onFocus, onBlur}) {
    const {setRef, saveSelectionRange} = useInputSelection({value});

    const onChangeWrapper = (e) => {
        // Fixes cursor jumping to the end of the input when typing
        saveSelectionRange(e);

        if (onChange) {
            onChange(e);
        }
    };

    return (
        <>
            <div className="relative">
                <input
                    ref={setRef}
                    className="relative w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800"
                    data-testid={dataTestId}
                    placeholder={placeholder}
                    value={value}
                    onBlur={onBlur}
                    onChange={onChangeWrapper}
                    onFocus={onFocus}
                />
            </div>
        </>
    );
}
