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
            color: textColor,
            backgroundColor,
            ...(style.button || {}) // Override any custom style
        }
    };
};

function ActionButton({label, onClick, disabled, retry, brandColor, style}) {
    let Style = Styles({disabled, retry, brandColor, style});
    return (
        <button onClick={e => onClick(e)} style={Style.button} className="gh-portal-btn gh-portal-btn-primary" disabled={disabled}>
            {label}
        </button>
    );
}

export default ActionButton;
