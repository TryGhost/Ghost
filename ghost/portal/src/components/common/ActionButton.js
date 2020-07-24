import React from 'react';
import getContrastColor from '../../utils/contrast-color';

export const ActionButtonStyles = `
    .gh-portal-btn-main {
        width: 100%;
        box-shadow: none;
    }

    .gh-portal-btn-main:hover {
        box-shadow: none;
    }

    .gh-portal-btn-primary:hover::before {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        content: "";
        background: rgba(255, 255, 255, 0.08);
        border-radius: 5px;
    }
`;

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
        <button className="gh-portal-btn gh-portal-btn-main gh-portal-btn-primary" style={Style.button} onClick={e => onClick(e)} disabled={disabled}>
            {label}
        </button>
    );
}

export default ActionButton;
