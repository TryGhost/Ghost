import React from 'react';

export function Input({dataTestId, list, value, placeholder, onChange}) {
    return (
        <input
            className="w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none"
            data-testid={dataTestId}
            list={list}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    );
}
