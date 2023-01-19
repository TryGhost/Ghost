import React from 'react';

export function Input({value, placeholder}) {
    return (
        <input className="w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal text-grey-900 focus-visible:outline-none" value={value} placeholder={placeholder} />
    );
}