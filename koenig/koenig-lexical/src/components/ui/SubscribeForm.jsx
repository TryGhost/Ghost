import React from 'react';
import useInputSelection from '../../hooks/useInputSelection';
import {Button} from './Button';

export function SubscribeForm({dataTestId, placeholder, value, inputBorderStyle, buttonSize, buttonText, buttonStyle, onChange, onFocus, onBlur}) {
    const {setRef, saveSelectionRange} = useInputSelection({value});

    const onChangeWrapper = (e) => {
        // Fixes cursor jumping to the end of the input when typing
        saveSelectionRange(e);

        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className='relative flex'>
            <input
                ref={setRef}
                className={`relative w-full border border-black py-2 px-4 font-sans font-normal text-grey-900 hover:cursor-not-allowed focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800 ${(buttonSize === 'small' ? 'h-10 text-md leading-[4rem]' : (buttonSize === 'medium' ? 'h-11 text-[1.6rem] leading-[4.4rem]' : 'h-12 text-lg leading-[4.8rem]'))}`}
                placeholder={placeholder}
                style={inputBorderStyle}
                value={value}
                readOnly
                onBlur={onBlur}
                onChange={onChangeWrapper}
                onFocus={onFocus}
            />
            <Button dataTestId={dataTestId} placeholder='' rounded={false} size={buttonSize} style={buttonStyle} value={buttonText} disabled/>
        </div>
    );
}
