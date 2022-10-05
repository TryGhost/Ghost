import React from 'react';
import {ReactComponent as UserIcon} from '../../images/icons/user.svg';

export const AvatarStyles = `
    .gh-portal-avatar {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin: 0 0 8px 0;
        border-radius: 999px;
    }

    .gh-portal-avatar img {
        position: absolute;
        display: block;
        top: -2px;
        right: -2px;
        bottom: -2px;
        left: -2px;
        width: calc(100% + 4px);
        height: calc(100% + 4px);
        opacity: 1;
        max-width: unset;
    }
`;

const Styles = ({style = {}}) => {
    return {
        avatarContainer: {
            ...(style.avatarContainer || {}) // Override any custom style
        },
        gravatar: {
            ...(style.avatarContainer || {}) // Override any custom style
        },
        userIcon: {
            width: '34px',
            height: '34px',
            color: '#fff',
            ...(style.userIcon || {}) // Override any custom style
        }
    };
};

function MemberGravatar({gravatar, style}) {
    let Style = Styles({style});
    return (
        <figure className='gh-portal-avatar' style={Style.avatarContainer}>
            <UserIcon style={Style.userIcon} />
            {gravatar ? <img style={Style.gravatar} src={gravatar} alt="" /> : null}
        </figure>
    );
}

export default MemberGravatar;
