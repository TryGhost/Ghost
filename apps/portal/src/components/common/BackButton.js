import React, {useContext} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as LeftArrowIcon} from '../../images/icons/arrow-left.svg';

export const BackButtonStyles = `
    .gh-portal-btn-back,
    .gh-portal-btn-back:hover {
        box-shadow: none;
        position: relative;
        height: unset;
        min-width: unset;
        position: fixed;
        top: 29px;
        left: 20px;
        background: none;
        padding: 8px;
        margin: 0;
        box-shadow: none;
        color: var(--grey3);
        border: none;
        z-index: 10000;
    }

    @media (max-width: 480px) {
        .gh-portal-btn-back,
        .gh-portal-btn-back:hover {
            left: 16px;
        }
    }

    .gh-portal-btn-back:hover {
        color: var(--grey1);
        transform: translateX(-4px);
    }

    .gh-portal-btn-back svg {
        width: 17px;
        height: 17px;
        margin-top: 1px;
        margin-right: 2px;
    }
`;

function ActionButton({label = null, brandColor = '#3eb0ef', hidden = false, onClick}) {
    const {t} = useContext(AppContext);

    if (hidden) {
        return null;
    }

    if (label === null) {
        label = t('Back');
    }

    return (
        <button className='gh-portal-btn gh-portal-btn-back' onClick={e => onClick(e)}>
            <LeftArrowIcon /> {label}
        </button>
    );
}

export default ActionButton;
