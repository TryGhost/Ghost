import React from 'react';
import {ReactComponent as UserIcon} from '../../images/icons/user.svg';

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
        <figure>
            <UserIcon style={Style.userIcon} />
            {gravatar ? <img src={gravatar} alt="Gravatar" style={Style.gravatar} /> : null}
        </figure>
    );
}

export default MemberGravatar;
