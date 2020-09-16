import React from 'react';
import {ReactComponent as LeftArrowIcon} from '../../images/icons/arrow-left.svg';

export const BackButtonStyles = `
    .gh-portal-btn-back,
    .gh-portal-btn-back:hover {
        box-shadow: none;
        position: relative;
        height: unset;
        min-width: unset;
        position: absolute;
        top: -3px;
        left: -12px;
        background: none;
        padding: 8px;
        margin: 0;
        box-shadow: none;
        color: var(--grey3);
    }

    .gh-portal-btn-back:hover {
        color: var(--grey1);
        transform: translateX(-4px);
    }

    .gh-portal-btn-back svg {
        width: 16px;
        height: 16px;
    }

    .gh-portal-btn-main:hover {
        box-shadow: none;
    }
`;

function ActionButton({label = 'Back', brandColor = '#3eb0ef', hidden = false, onClick}) {
    if (hidden) {
        return;
    }

    return (
        <button className='gh-portal-btn gh-portal-btn-back' onClick={e => onClick(e)}>
            <LeftArrowIcon /> {label}
        </button>
    );
}

export default ActionButton;
