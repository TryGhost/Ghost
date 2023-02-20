import React from 'react';

export function Dropdown() {
    return (
        <select className="w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal text-grey-900 focus-visible:outline-none">
            <option>Free members</option>
            <option>Paid members</option>
        </select>
    );
}