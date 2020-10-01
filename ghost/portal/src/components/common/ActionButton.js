import React from 'react';
import getContrastColor from '../../utils/contrast-color';
import {ReactComponent as LoaderIcon} from '../../images/icons/loader.svg';
import {isCookiesDisabled} from '../../utils/helpers';

export const ActionButtonStyles = `
    .gh-portal-btn-main {
        box-shadow: none;
        position: relative;
        height: 42px;
        border: none;
    }

    .gh-portal-btn-main:hover {
        box-shadow: none;
        border: none;
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
        border: none;
    }

    .gh-portal-btn-primary:disabled:hover::before {
        display: none;
    }

    .gh-portal-btn-destructive:not(:disabled):hover {
        color: var(--red);
        border-color: var(--red);
    }

    .gh-portal-loadingicon {
        position: absolute;
        left: 50%;
        display: inline-block;
        margin-left: -19px;
        height: 31px;
    }

    .gh-portal-loadingicon path,
    .gh-portal-loadingicon rect {
        fill: #fff;
    }

    .gh-portal-loadingicon.dark path,
    .gh-portal-loadingicon.dark rect {
        fill: #1d1d1d;
    }
`;

const Styles = ({brandColor, retry, disabled, style = {}, isPrimary}) => {
    let backgroundColor = (brandColor || '#3eb0ef');
    let opacity = '1.0';
    let pointerEvents = 'auto';

    if (disabled) {
        opacity = '0.5';
        pointerEvents = 'none';
    }
    const textColor = getContrastColor(backgroundColor);

    return {
        button: {
            ...(isPrimary ? {color: textColor} : {}),
            ...(isPrimary ? {backgroundColor} : {}),
            opacity,
            pointerEvents,
            ...(style || {}) // Override any custom style
        }
    };
};

function ActionButton({label, type, onClick, disabled, retry, brandColor, isRunning, isPrimary = true, isDestructive = false, style}) {
    let Style = Styles({disabled, retry, brandColor, style, isPrimary});

    let className = 'gh-portal-btn';
    if (isPrimary) {
        className += ' gh-portal-btn-main gh-portal-btn-primary';
    }
    if (isDestructive) {
        className += ' gh-portal-btn-destructive';
    }
    if (isCookiesDisabled()) {
        disabled = true;
    }
    const loaderClassName = isPrimary ? 'gh-portal-loadingicon' : 'gh-portal-loadingicon dark';
    return (
        <button className={className} style={Style.button} onClick={e => onClick(e)} disabled={disabled} type='submit'>
            {isRunning ? <LoaderIcon className={loaderClassName} /> : label}
        </button>
    );
}

export default ActionButton;
