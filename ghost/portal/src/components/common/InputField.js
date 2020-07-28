import React from 'react';

export const InputFieldStyles = `
    .gh-portal-input {
        display: block;
        box-sizing: border-box;
        font-size: 1.5rem;
        color: inherit;
        background: var(--white);
        outline: none;
        border: none;
        border-radius: 3px;
        width: 100%;
        height: 40px;
        padding: 0 12px;
        margin-bottom: 18px;
        letter-spacing: 0.2px;
        box-shadow: 0px 0px 0px 1px #e1e1e1 , 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
        transition: all 0.25s ease-in-out;
    }

    .gh-portal-input-label.hidden {
        display: none;
    }

    .gh-portal-input:focus {
        border: none;
        box-shadow: 0px 0px 0px 1px #c5c5c5 , 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
    }

    .gh-portal-input::placeholder {
        color: var(--grey7);
    }
`;

function InputError({message, style}) {
    if (!message) {
        return null;
    }
    return (
        <p style={{
            color: '#f05230',
            width: '100%',
            lineHeight: '0',
            ...(style || {})
        }}>
            {message}
        </p>
    );
}

function InputField({name, id, label, hideLabel, type, value, placeholder, disabled, onChange, onBlur, errorMessage, brandColor}) {
    id = id || `input-${name}`;
    onBlur = onBlur || function (){};
    const labelClasses = hideLabel ? 'gh-portal-input-label hidden' : 'gh-portal-input-label';
    return (
        <section className='gh-portal-input-section'>
            <label htmlFor={id} className={labelClasses}> {label} </label>
            <input
                id={id}
                className='gh-portal-input'
                type={type}
                name={name}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e, name)}
                onBlur={e => onBlur(e, name)}
                disabled={disabled}
                aria-label={label}
            />
            <InputError message={errorMessage} name={name} />
        </section>
    );
}

export default InputField;
