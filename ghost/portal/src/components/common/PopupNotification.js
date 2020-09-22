import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

export const PopupNotificationStyles = `
    .gh-portal-popupnotification {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        padding: 8px;
        background: var(--green);
        z-index: 9999;
        border-radius: 4px;
        font-size: 1.3rem;
        box-shadow: 0px 0.8151839971542358px 0.8151839971542358px 0px rgba(0,0,0,0.01),
                    0px 2.2538793087005615px 2.2538793087005615px 0px rgba(0,0,0,0.02), 
                    0px 5.426473140716553px 5.426473140716553px 0px rgba(0,0,0,0.03),  
                    0px 18px 18px 0px rgba(0,0,0,0.04);
        animation: popupnotification-slidein 0.6s ease-in-out;
    }

    .gh-portal-popupnotification.slideout {
        animation: popupnotification-slideout 0.6s ease-in-out;
    }

    .gh-portal-popupnotification p {
        color: var(--white);
        margin: 0;
        padding: 0;
        font-size: 1.4rem;
        letter-spacing: 0.2px;
        text-align: center;
    }

    .gh-portal-popupnotification .closeicon {
        position: absolute;
        top: 1px;
        bottom: 0;
        right: 0;
        color: var(--white);
        cursor: pointer;
        width: 12px;
        height: 12px;
        padding: 12px;
        transition: all 0.2s ease-in-out forwards;
        opacity: 0.8;
    }
    
    .gh-portal-popupnotification .closeicon:hover {
        opacity: 1.0;
    }

    .gh-portal-popupnotification.success {
        background: var(--green);
    }

    .gh-portal-popupnotification.error {
        background: var(--red);
    }

    @keyframes popupnotification-slidein {
        0% { transform: translateY(-100px); }
        60% { transform: translateY(8px); }
        100% { transform: translateY(0); }
    }

    @keyframes popupnotification-slideout {
        0% { transform: translateY(0); }
        40% { transform: translateY(8px); }
        100% { transform: translateY(-100px); }
    }
`;

export default class PopupNotification extends React.Component {
    static contextType = AppContext;
    render() {
        return (
            <div className='gh-portal-popupnotification success'>
                <p>Plan changed successfully</p>
                <CloseIcon className='closeicon' alt='Close' />
            </div>
        );
    }
}