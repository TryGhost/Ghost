import React from 'react';
import {ReactComponent as CloseIcon} from '../../../assets/icons/kg-close.svg';

export const Input = ({value, onChange, onClear}) => {
    return (
        <div className="relative m-0 flex h-[36px] min-w-[240px] items-center justify-evenly rounded bg-black py-0 font-sans text-md font-medium after:absolute after:top-[36px] after:left-[calc(50%-8px)] after:w-0 after:border-x-8 after:border-t-8 after:border-x-transparent after:border-t-black">
            <input
                className="mb-[1px] h-auto w-full rounded bg-black pl-3 pr-9 leading-loose text-white selection:bg-grey/40"
                placeholder="Snippet name"
                value={value}
                onChange={onChange}
            />
            <button aria-label="Close" className="absolute right-3 cursor-pointer" type="button" onClick={onClear}>
                <CloseIcon className="h-3 w-3 stroke-2 text-grey" />
            </button>
        </div>
    );
};
