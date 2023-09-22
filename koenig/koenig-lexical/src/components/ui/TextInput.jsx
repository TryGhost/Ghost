import React from 'react';

export function TextInput({value, onChange, ...args}) {
    const handleOnChange = (e) => {
        onChange(e);
    };

    return (
        <input
            defaultValue={value}
            onChange={handleOnChange}
            {...args}
        />
    );
}
