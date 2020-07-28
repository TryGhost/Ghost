import {AvatarStyles} from './common/MemberGravatar';

const GlobalStyle = `
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
    }

    .gh-portal-triggerbtn-container {
        display: flex;
        align-items: center;
        padding: 0 24px;
    }

    .gh-portal-triggerbtn-container.with-label {
        padding: 0 16px 0 20px;
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