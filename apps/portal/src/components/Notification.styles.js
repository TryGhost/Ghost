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
        gap: 12px;
        align-items: flex-start;
        top: 12px;
        right: 12px;
        width: 100%;
        padding: 16px;
        max-width: 380px;
        font-size: 1.3rem;
        letter-spacing: 0.2px;
        background: var(--white);
        backdrop-filter: blur(8px);
        color: var(--grey0);
        border-radius: 7px;
        box-shadow: 0px 0px 1px 0px rgba(0, 0, 0, 0.30), 0px 51px 40px 0px rgba(0, 0, 0, 0.05), 0px 15.375px 12.059px 0px rgba(0, 0, 0, 0.03), 0px 6.386px 5.009px 0px rgba(0, 0, 0, 0.03), 0px 2.31px 1.812px 0px rgba(0, 0, 0, 0.02);
        animation: notification-slidein 0.55s cubic-bezier(0.215, 0.610, 0.355, 1.000);
        z-index: 99999;
    }

    html[dir="rtl"] .gh-portal-notification {
        right: unset;
        left: 12px;
        padding: 14px 20px 18px 44px;
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
        text-align: start;
        margin: 0;
        padding: 0;
        color: var(--grey0);
    }

    .gh-portal-notification p strong {
        color: var(--grey0);
    }

    .gh-portal-notification a {
        color: var(--grey0);
        text-decoration: underline;
        transition: all 0.2s ease-in-out;
        outline: none;
    }

    .gh-portal-notification a:hover {
        opacity: 0.8;
    }

    .gh-portal-notification-icon {
        width: 18px;
        height: 18px;
        min-width: 18px;
        margin-top: 2px;
    }
    html[dir="rtl"] .gh-portal-notification-icon {
        right: 17px;
        left: unset;
    }

    .gh-portal-notification-icon.success {
        color: var(--green);
    }

    .gh-portal-notification-icon.error {
        color: var(--red);
    }

    .gh-portal-notification-closeicon {
        color: var(--grey8);
        cursor: pointer;
        width: 12px;
        min-width: 12px;
        height: 12px;
        padding: 10px;
        margin-top: -6px;
        margin-right: -6px;
        margin-bottom: -6px;
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

    @media (max-width: 480px) {
        .gh-portal-notification {
            left: 12px;
            max-width: calc(100% - 24px);
            animation-name: notification-slidein-mobile;
        }
        html[dir="rtl"] .gh-portal-notification {
            right: 12px;
            left: unset;
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