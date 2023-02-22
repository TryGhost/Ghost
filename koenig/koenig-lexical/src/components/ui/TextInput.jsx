import React from 'react';

export function TextInput({initialValue, onChange, ...args}) {
    const [value, setValue] = React.useState(initialValue);

    const handleOnChange = (e) => {
        setValue(e.target.value);
        onChange(e.target.value);
    };
    
    return (
        <input
            value={value}
            onChange={handleOnChange}
            {...args}
        />
    );
}
