import {GlobalStyles} from './Global.styles';
import {AvatarStyles} from './common/MemberGravatar';

const TriggerButtonStyles = `
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
    GlobalStyles +
    TriggerButtonStyles + 
    AvatarStyles;

export default TriggerButtonStyle;