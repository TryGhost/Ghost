import React from 'react';
import useInputSelection from '../../hooks/useInputSelection';

export function TextInput({value, onChange, ...args}) {
    const {setRef, saveSelectionRange} = useInputSelection({value});

    const handleOnChange = (e) => {
        saveSelectionRange(e);
        onChange(e.target.value);
    };

    return (
        <input
            ref={setRef}
            value={value}
            onChange={handleOnChange}
            {...args}
        />
    );
}
