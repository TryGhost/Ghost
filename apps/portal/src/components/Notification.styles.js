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
        padding: 16px 44px 16px 20px;
        max-width: 380px;
        min-height: 66px;
        font-size: 1.3rem;
        letter-spacing: 0.2px;
        background: var(--white);
        backdrop-filter: blur(8px);
        color: var(--grey0);
        border-radius: 7px;
        box-shadow: 0px 0px 1px 0px rgba(0, 0, 0, 0.30), 0px 51px 40px 0px rgba(0, 0, 0, 0.05), 0px 15.375px 12.059px 0px rgba(0, 0, 0, 0.03), 0px 6.386px 5.009px 0px rgba(0, 0, 0, 0.03), 0px 2.31px 1.812px 0px rgba(0, 0, 0, 0.02);
        animation: notification-slidein 0.55s cubic-bezier(0.215, 0.610, 0.355, 1.000);
    }

    .gh-portal-notification.slideout {
        /*animation: notification-slideout 0.4s cubic-bezier(0.550, 0.055, 0.675, 0.190);*/
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
        padding: 0 0 0 26px;
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
        position: absolute;
        top: calc(50% - 20px);
        left: 16px;
        width: 18px;
        height: 18px;
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
        color: var(--grey8);
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