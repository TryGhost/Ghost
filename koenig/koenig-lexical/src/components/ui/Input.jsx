import React from 'react';

export function Input({dataTestId, list, listOptions, listVisibility, handleOptionClick, value, placeholder, onChange, onFocus}) {    
    return (
        <>
            <div className="relative">
                <input
                    className="relative w-full rounded border border-grey-300 p-2 font-sans text-sm font-normal leading-snug text-grey-900 focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800"
                    data-testid={dataTestId}
                    list={list}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={onFocus}
                />
                {list && listOptions && listVisibility && <ul className="absolute mt-[-1px] max-h-[30vh] w-full overflow-y-auto rounded-b border border-grey-200 bg-white py-1 shadow dark:border-grey-800 dark:bg-grey-900">
                    {listOptions.map((item) => {
                        return <li key={item.value} className="cursor-pointer px-4 py-2 text-left hover:bg-grey-100 dark:hover:bg-black" onClick={event => handleOptionClick(event,item.caption)}>
                            <span className="block text-sm font-semibold leading-tight text-black dark:text-white">{item.value}</span>
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-grey-700 dark:text-grey-600">
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
