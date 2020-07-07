import React from 'react';
import getContrastColor from '../../utils/contrast-color';

const Styles = ({brandColor, retry, disabled, style = {}}) => {
    let backgroundColor = (brandColor || '#3eb0ef');
    if (retry) {
        backgroundColor = '#FF0000';
    }

    if (disabled) {
        backgroundColor = '#D3D3D3';
    }
    const textColor = getContrastColor(backgroundColor);
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
            color: textColor,
            backgroundColor,
            boxShadow: 'none',
            userSelect: 'none',
            width: '100%',
            ...(style.button || {}) // Override any custom style
        }
    };
};

function ActionButton({label, onClick, disabled, retry, brandColor, style}) {
    let Style = Styles({disabled, retry, brandColor, style});
    return (
        <button onClick={e => onClick(e)} style={Style.button} disabled={disabled}>
            {label}
        </button>
    );
}

export default ActionButton;
