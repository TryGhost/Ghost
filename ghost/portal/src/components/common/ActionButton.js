import React from 'react';

const Styles = ({brandColor, disabled, style = {}}) => {
    return {
        button: {
            display: 'inline-block',
            padding: '0 1.8rem',
            height: '44px',
            border: '0',
            fontSize: '1.5rem',
            lineHeight: '42px',
            fontWeight: '600',
            textAlign: 'center',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: '.4s ease',
            color: '#fff',
            backgroundColor: disabled ? 'grey' : (brandColor || '#3eb0ef'),
            boxShadow: 'none',
            userSelect: 'none',
            width: '100%',
            marginBottom: '12px',
            ...(style.button || {}) // Override any custom style
        }
    };
};

function ActionButton({label, onClick, disabled, brandColor, style}) {
    let Style = Styles({disabled, brandColor, style});
    return (
        <button onClick={e => onClick(e)} style={Style.button} disabled={disabled}>
            {label}
        </button>
    );
}

export default ActionButton;
