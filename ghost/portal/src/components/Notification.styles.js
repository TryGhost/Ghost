import {GlobalStyles} from './Global.styles';

const NotificationStyles = `
    .gh-portal-notification-wrapper {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 12px;
    }
    
    .gh-portal-notification {
        position: relative;
        width: 100%;
        padding: 12px 44px;
        max-width: 100%;
        font-size: 1.4rem;
        letter-spacing: 0.2px;
        background: var(--grey1);
        color: var(--white);
        border-radius: 5px;
        box-shadow: 0 3.2px 3.6px rgba(0, 0, 0, 0.024), 0 8.8px 10px -5px rgba(0, 0, 0, 0.12);
        animation: notification-slidein 0.6s ease-in-out;
    }

    .gh-portal-notification p {
        flex-grow: 1;
        text-align: center;
        margin: 0;
        padding: 0;
    }

    .gh-portal-notification a {
        color: var(--white);
        text-decoration: underline;
        transition: all 0.2s ease-in-out;
        outline: none;
    }

    .gh-portal-notification a:hover {
        opacity: 0.8;
    }

    .gh-portal-notification-closeicon {
        position: absolute;
        top: 5px;
        bottom: 0;
        right: 5px;
        color: var(--white);
        cursor: pointer;
        width: 14px;
        height: 14px;
        padding: 12px;
        transition: all 0.2s ease-in-out forwards;
        opacity: 0.5;
    }

    .gh-portal-notification-closeicon:hover {
        opacity: 1.0;
    }

    .gh-portal-notification.success {
        background: var(--green);
    }

    .gh-portal-notification.warning {
        background: var(--yellow);
        color: var(--grey1);
    }

    .gh-portal-notification.warning a {
        color: var(--grey1);
    }

    .gh-portal-notification.warning .gh-portal-notification-closeicon {
        color: var(--grey1);
    }

    .gh-portal-notification.error {
        background: var(--red);
    }

    .gh-portal-notification.branded {
        background: var(--brandcolor);
    }

    @keyframes notification-slidein {
        0% { transform: translateY(-100px); }
        60% { transform: translateY(8px); }
        100% { transform: translateY(0); }
    }
`;

const NotificationStyle = 
    GlobalStyles +
    NotificationStyles;

export default NotificationStyle;