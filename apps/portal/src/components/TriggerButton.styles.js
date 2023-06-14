import {GlobalStyles} from './Global.styles';
import {AvatarStyles} from './common/MemberGravatar';

const TriggerButtonStyles = `
    .gh-portal-triggerbtn-wrapper {
        display: inline-flex;
        align-items: flex-start;
        justify-content: flex-end;
        height: 100%;
        opacity: 1;
        transition: transform 0.16s linear 0s; opacity 0.08s linear 0s;
        user-select: none;
        line-height: 1;
        padding: 10px 28px 0 17px;
    }
    
    .gh-portal-triggerbtn-wrapper span {
        margin-bottom: 1px;
    }
    
    .gh-portal-triggerbtn-container {
        position: relative;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--brandcolor);
        height: 60px;
        min-width: 60px;
        box-shadow: rgba(0, 0, 0, 0.24) 0px 8px 16px -2px;
        border-radius: 999px;
        transition: opacity 0.3s ease;
    }

    .gh-portal-triggerbtn-container:before {
        position: absolute;
        content: "";
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: 999px;
        background: rgba(var(--whitergb), 0);
        transition: background 0.3s ease;
    }

    .gh-portal-triggerbtn-container:hover:before {
        background: rgba(var(--whitergb), 0.08);
    }

    .gh-portal-triggerbtn-container.halo:before {
        top: -4px;
        right: -4px;
        bottom: -4px;
        left: -4px;
        border: 4px solid rgba(var(--whitergb), 0.15);
    }

    .gh-portal-triggerbtn-container.with-label {
        padding: 0 12px 0 16px;
    }

    .gh-portal-triggerbtn-label {
        padding: 8px;
        color: var(--white);
        display: block;
        white-space: nowrap;
        max-width: 380px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gh-portal-avatar {
        margin-bottom: 0px !important;
        width: 60px;
        height: 60px;
    }
`;

const TriggerButtonStyle = 
    GlobalStyles +
    TriggerButtonStyles + 
    AvatarStyles;

export default TriggerButtonStyle;