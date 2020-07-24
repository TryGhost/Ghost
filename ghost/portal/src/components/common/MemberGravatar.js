import React from 'react';
import {ReactComponent as UserIcon} from '../../images/icons/user.svg';

export const AvatarStyles = `
    .gh-portal-avatar {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 8px;
        border-radius: 999px;
    }

    .gh-portal-avatar img {
        display: block;
        position: absolute;
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        opacity: 1;
        maxWidth: unset;
    }
`;

const Styles = ({style = {}}) => {
    return {
        userIcon: {
            width: '56px',
            height: '56px',
            color: '#fff',
            ...(style.userIcon || {}) // Override any custom style
        }
    };
};

function MemberGravatar({gravatar, style}) {
    let Style = Styles({style});
    return (
        <figure className='gh-portal-avatar'>
            <UserIcon style={Style.userIcon} />
            {gravatar ? <img src={gravatar} alt="Gravatar" /> : null}
        </figure>
    );
}

export default MemberGravatar;
