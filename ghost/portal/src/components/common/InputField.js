import React from 'react';

export const InputFieldStyles = `
    .gh-portal-input {
        display: block;
        padding: 0 12px;
        width: 100%;
        height: 40px;
        outline: none;
        color: inherit;
        background: #fff;
        border: none;
        border-radius: 3px;
        font-size: 1.5rem;
        margin-bottom: 18px;
        box-sizing: border-box;
        letter-spacing: 0.2px;
        box-shadow: 0px 0px 0px 1px #e1e1e1 , 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
        transition: all 0.25s ease-in-out;
    }

    .gh-portal-input:focus {
        border: none;
        box-shadow: 0px 0px 0px 1px #c5c5c5 , 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
    }

    .gh-portal-input::placeholder {
        color: #929292;
    }
`;

function InputField({name, id, label, type, value, placeholder, disabled, onChange, brandColor}) {
    id = id || `input-${name}`;
    return (
        <>
            <label htmlFor={id} className='gh-portal-setting-heading'> {label} </label>
            <input
                id={id}
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                className='gh-portal-input'
                disabled={disabled}
                onChange={e => onChange(e, name)}
                aria-label={label}
            />
        </>
    );
}

export default InputField;
