import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TextInput({value, onChange, ...args}: TextInputProps) {
    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
