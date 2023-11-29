import CloseIcon from '../../../assets/icons/kg-close.svg?react';
import React from 'react';

export const Input = ({value, onChange, onClear, onKeyDown, arrowStyles}) => {
    return (
        <div className="shadow-[0 18px 45px -5px rgba(0,0,0,.15)] relative m-0 flex h-[35px] min-w-[240px] items-center justify-evenly rounded bg-white py-0 font-sans text-sm font-medium">
            <input
                autoFocus={true}
                className={`mb-[1px] h-auto w-full border bg-white py-1 pl-3 pr-9 font-normal leading-loose text-grey-900 selection:bg-grey/40 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800 ${value ? 'rounded-b-none rounded-t border-grey-300 dark:border-grey-900' : 'rounded border-green'}`}
                data-testid="snippet-name"
                placeholder="Snippet name"
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
            />
            <button aria-label="Close" className="absolute right-3 cursor-pointer" type="button" onClick={onClear}>
                <CloseIcon className="h-3 w-3 stroke-2 text-grey" />
            </button>

            {/* Arrow block. Used div instead of pseudo-element. Arrow requires dynamic values for position,
             and Tailwind can't handle this. They recommended CSS-in-JS or style attr for such cases (https://v2.tailwindcss.com/docs/just-in-time-mode) */}
            <div
                className="absolute left-[calc(50%-8px)] top-[35px] w-0 border-x-[9px] border-t-[9px] border-x-transparent border-t-green after:absolute after:left-[calc(50%-8px)] after:top-[-9px] after:w-0 after:border-x-8 after:border-t-8 after:border-x-transparent after:border-t-white dark:after:border-t-grey-950"
                style={arrowStyles}
            ></div>
        </div>
    );
};
