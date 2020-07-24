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
`;

const Styles = ({style = {}}) => {
    return {
        userIcon: {
            width: '20px',
            height: '20px',
            color: '#fff',
            ...(style.userIcon || {}) // Override any custom style
        },
        gravatar: {
            display: 'block',
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            bottom: '-1px',
            left: '-1px',
            width: 'calc(100% + 2px)',
            height: 'calc(100% + 2px)',
            opacity: '1',
            maxWidth: 'unset',
            ...(style.gravatar || {}) // Override any custom style
        }
    };
};

function MemberGravatar({gravatar, style}) {
    let Style = Styles({style});
    return (
        <figure className='gh-portal-avatar'>
            <UserIcon style={Style.userIcon} />
            {gravatar ? <img style={Style.gravatar} src={gravatar} alt="Gravatar" /> : null}
        </figure>
    );
}

export default MemberGravatar;
