import React from 'react';
import {ReactComponent as CloseIcon} from '../../../assets/icons/kg-close.svg';

export const Input = ({value, onChange, onClear, onKeyDown}) => {
    return (
        <div className="shadow-[0 18px 45px -5px rgba(0,0,0,.15)] relative m-0 flex h-[35px] min-w-[240px] items-center justify-evenly rounded bg-white py-0 font-sans text-sm font-medium before:absolute before:top-[35px] before:left-[calc(50%-8px)] before:w-0 before:border-x-[9px] before:border-t-[9px] before:border-x-transparent before:border-t-green after:absolute after:top-[35px] after:left-[calc(50%-8px)] after:ml-[1px] after:w-0 after:border-x-8 after:border-t-8 after:border-x-transparent after:border-t-white">
            <input
                autoFocus={true}
                className={`mb-[1px] h-auto w-full rounded border border-green bg-white py-1 pl-3 pr-9 font-normal leading-loose text-grey-900 selection:bg-grey/40 empty:rounded-t empty:rounded-b-none ${value ? '' : 'border border-green rounded-t rounded-b-none'}`}
                placeholder="Snippet name"
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
            />
            <button aria-label="Close" className="absolute right-3 cursor-pointer" type="button" onClick={onClear}>
                <CloseIcon className="h-3 w-3 stroke-2 text-grey" />
            </button>
        </div>
    );
};
