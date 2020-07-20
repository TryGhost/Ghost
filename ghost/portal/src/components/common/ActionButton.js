import React from 'react';
import getContrastColor from '../../utils/contrast-color';

export const ActionButtonStyles = `
.gh-portal-btn {
    position: relative;
    display: inline-block;
    padding: 0 1.8rem;
    height: 44px;
    border: 0;
    font-size: 1.5rem;
    line-height: 42px;
    font-weight: 500;
    letter-spacing: 0.2px;
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    border-radius: 5px;
    cursor: pointer;
    transition: .4s ease;
    box-shadow: none;
    user-select: none;
    width: 100%;
}

.gh-portal-btn:hover::before {
    position: absolute;
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
        <button onClick={e => onClick(e)} style={Style.button} className="gh-portal-btn gh-portal-btn-primary" disabled={disabled}>
            {label}
        </button>
    );
}

export default ActionButton;
