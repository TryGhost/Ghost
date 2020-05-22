import React from 'react';

const Styles = ({disabled, style = {}} = {}) => {
    return {
        input: {
            display: 'block',
            padding: '0 .6em',
            width: '100%',
            height: '44px',
            outline: '0',
            border: '1px solid #c5d2d9',
            color: 'inherit',
            textDecoration: 'none',
            background: disabled ? '#ececec' : '#fff',
            borderRadius: '9px',
            fontSize: '14px',
            marginBottom: '12px',
            boxSizing: 'border-box',
            ...(style.input || {}) // Override any custom style
        },
        label: {
            marginBottom: '3px',
            fontSize: '12px',
            fontWeight: '700',
            ...(style.label || {}) // Override any custom style
        }
    };
};

function InputField({name, id, label, type, value, placeholder, disabled, onChange, style}) {
    const Style = Styles({disabled, style});
    id = id || `input-${name}`;
    return (
        <>
            <label htmlFor={id} style={Style.label}> {label} </label>
            <input
                id={id}
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                onChange={e => onChange(e, name)}
                style={Style.input}
                aria-label={label}
            />
        </>
    );
}

export default InputField;
