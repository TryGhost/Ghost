import React from 'react';

export function Input({dataTestId, list, listOptions, handleOptionClick, value, placeholder, onChange}) {    
    return (
        <>
            <div className="relative">
                <input
                    className="relative w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none"
                    data-testid={dataTestId}
                    list={list}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                />
                {list && listOptions && <ul className="absolute mt-[-1px] max-h-[30vh] w-full overflow-y-auto rounded-b border border-grey-200 bg-white py-1 shadow">
                    {listOptions.map((item) => {
                        return <li key={item.value} className="cursor-pointer px-4 py-2 text-left hover:bg-grey-100" onClick={() => handleOptionClick(item.caption)}>
                            <span className="block text-sm font-semibold leading-tight text-black">{item.value}</span>
                            <span className="block text-xs leading-tight text-grey-700">
                                {item.caption}
                            </span>
                        </li>;
                    })}
                </ul>
                }
            </div>
        </>
    );
}
