import {AvatarStyles} from './common/MemberGravatar';

const GlobalStyle = `
    html {
        font-size: 62.5%;
        height: 100%;
    }

    body {
        margin: 0px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.6rem;
        height: 100%;
        line-height: 1.6em;
        font-weight: 400;
        font-style: normal;
        color: var(--grey4);
    }

    *, ::after, ::before {
        box-sizing: border-box;
    }

    svg {
        box-sizing: content-box;
    }
    
    .gh-portal-triggerbtn-wrapper {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        opacity: 1;
        transform: rotate(0deg) scale(1);
        height: 100%;
        transition: transform 0.16s linear 0s; opacity 0.08s linear 0s;
        overflow: hidden;
        user-select: none;
        background: var(--brandcolor);
        line-height: 1;
    }

    .gh-portal-triggerbtn-wrapper span {
        margin-bottom: 1px;
    }

    .gh-portal-triggerbtn-container {
        display: flex;
        align-items: center;
        padding: 0 24px;
    }

    .gh-portal-triggerbtn-container.with-label {
        padding: 0 12px 0 16px;
    }

    .gh-portal-avatar {
        margin-bottom: 16px !important;
        width: 60px;
        height: 60px;
    }
`;

const TriggerButtonStyle = 
    GlobalStyle +
    AvatarStyles;

export default TriggerButtonStyle;