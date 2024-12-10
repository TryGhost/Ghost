import CloseIcon from '../../../assets/icons/kg-close.svg?react';
import React from 'react';

export const Input = ({value, onChange, onClear, onKeyDown}) => {
    return (
        <div className="relative m-0 flex items-center justify-evenly gap-1 rounded-lg bg-white font-sans text-md font-normal text-black shadow-md dark:bg-grey-950">
            <input
                autoComplete="off"
                autoFocus={true}
                className={`mb-[1px] h-auto w-full bg-white py-1 pl-3 pr-9 font-normal leading-loose text-grey-900 selection:bg-grey/40 dark:bg-grey-950 dark:text-grey-100 dark:placeholder:text-grey-800 ${value ? 'rounded-b-none rounded-t' : 'rounded'}`}
                data-testid="snippet-name"
                placeholder="Snippet name"
                value={value}
                data-1p-ignore
                onChange={onChange}
                onKeyDown={onKeyDown}
            />
            <button aria-label="Close" className="absolute right-3 cursor-pointer" type="button" onClick={onClear}>
                <CloseIcon className="size-3 stroke-2 text-grey" />
            </button>
        </div>
    );
};
