import {GlobalStyles} from './Global.styles';

const NotificationStyles = `
    .gh-portal-notification-wrapper {
        position: relative;
        overflow: hidden;
        height: 100%;
        width: 100%;
    }

    .gh-portal-notification {
        position: absolute;
        display: flex;
        align-items: center;
        top: 12px;
        right: 12px;
        width: 100%;
        padding: 14px 44px 18px 20px;
        max-width: 380px;
        min-height: 66px;
        font-size: 1.3rem;
        letter-spacing: 0.2px;
        background: rgba(var(--grey1rgb),0.95);
        backdrop-filter: blur(8px);
        color: var(--white);
        border-radius: 7px;
        box-shadow: 0 3.2px 3.6px rgba(var(--black), 0.024), 0 8.8px 10px -5px rgba(var(--black), 0.08);
        animation: notification-slidein 0.55s cubic-bezier(0.215, 0.610, 0.355, 1.000);
    }

    .gh-portal-notification.slideout {
        animation: notification-slideout 0.4s cubic-bezier(0.550, 0.055, 0.675, 0.190);
    }

    .gh-portal-notification.hide {
        display: none;
    }

    .gh-portal-notification p {
        flex-grow: 1;
        font-size: 1.4rem;
        line-height: 1.5em;
        text-align: left;
        margin: 0;
        padding: 0 0 0 40px;
        color: var(--grey13);
    }

    .gh-portal-notification p strong {
        color: var(--white);
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

    .gh-portal-notification-icon {
        position: absolute;
        top: calc(50% - 14px);
        left: 17px;
        width: 28px;
        height: 28px;
    }

    .gh-portal-notification-icon.success {
        color: var(--green);
    }

    .gh-portal-notification-icon.error {
        color: var(--red);
    }

    .gh-portal-notification-closeicon {
        position: absolute;
        top: 5px;
        bottom: 0;
        right: 5px;
        color: var(--white);
        cursor: pointer;
        width: 12px;
        height: 12px;
        padding: 10px;
        transition: all 0.2s ease-in-out forwards;
        opacity: 0.8;
    }

    .gh-portal-notification-closeicon:hover {
        opacity: 1.0;
    }    

    @keyframes notification-slidein {
        0% { transform: translateX(380px); }
        60% { transform: translateX(-6px); }
        100% { transform: translateX(0); }
    }

    @keyframes notification-slideout {
        0% { transform: translateX(0); }
        30% { transform: translateX(-10px); }
        100% { transform: translateX(380px); }
    }

    @keyframes notification-slidein-mobile {
        0% { transform: translateY(-150px); }
        50% { transform: translateY(6px); }
        100% { transform: translateY(0); }
    }

    @keyframes notification-slideout-mobile {
        0% { transform: translateY(0); }
        35% { transform: translateY(6px); }
        100% { transform: translateY(-150px); }
    }

    @media (max-width: 414px) {
        .gh-portal-notification {
            left: 12px;
            max-width: calc(100% - 24px);
            animation-name: notification-slidein-mobile;
        }

        .gh-portal-notification.slideout {
            animation-duration: 0.55s;
            animation-name: notification-slideout-mobile;
        }
    }
`;

const NotificationStyle =
    GlobalStyles +
    NotificationStyles;

export default NotificationStyle;