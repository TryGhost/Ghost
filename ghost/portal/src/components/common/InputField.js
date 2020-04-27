import React from 'react';

const Styles = ({style = {}}) => {
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
            background: '#fff',
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

function InputField({name, label, type, value, placeholder, onChange, style}) {
    const Style = Styles({style});
    return (
        <>
            <label htmlFor={name} style={Style.label}> {label} </label>
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e, name)}
                style={Style.input}
            />
        </>
    );
}

export default InputField;
