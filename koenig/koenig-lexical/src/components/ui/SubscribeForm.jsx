import React from 'react';
import useInputSelection from '../../hooks/useInputSelection';
import {Button} from './Button';

export function SubscribeForm({dataTestId, placeholder, value, inputBorderStyle, buttonSize, buttonText, buttonStyle, onChange, onFocus, onBlur, disabled}) {
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
                className={`relative w-full border border-black py-2 px-4 font-sans font-normal text-grey-900 hover:cursor-not-allowed focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800 ${(buttonSize === 'small' ? 'h-10 text-md leading-[4rem]' : buttonSize === 'medium' ? 'h-11 text-[1.6rem] leading-[4.4rem]' : buttonSize === 'large' ? 'h-12 text-lg leading-[4.8rem]' : 'h-[5.6rem] text-xl leading-[5.6rem]')}`}
                placeholder={placeholder}
                style={inputBorderStyle}
                tabIndex={disabled ? '-1' : ''}
                value={value}
                readOnly
                onBlur={onBlur}
                onChange={onChangeWrapper}
                onFocus={onFocus}
            />
            <Button dataTestId={dataTestId} disabled={disabled} placeholder='' rounded={false} size={buttonSize} style={buttonStyle} value={buttonText}/>
        </div>
    );
}
