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
        background: #f4f4f4;
    }

    .gh-portal-avatar-initials {
        font-weight: 600;
        font-size: 14px;
        color: #666;
        text-transform: uppercase;
    }
`;

const Styles = ({style = {}}) => {
    return {
        avatarContainer: {
            ...(style.avatarContainer || {}) // Override any custom style
        },
        userIcon: {
            width: '34px',
            height: '34px',
            color: '#999',
            ...(style.userIcon || {}) // Override any custom style
        },
        initials: {
            ...(style.initials || {}) // Override any custom style
        }
    };
};

function getInitials(name, email) {
    if (!name && !email) {
        return '';
    }
    
    const displayName = name || email;
    
    if (email && !name) {
        // If only email, use first character of username
        const username = email.split('@')[0];
        return username ? username[0].toUpperCase() : '';
    }
    
    const parts = displayName.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) {
        return '';
    }
    
    if (parts.length === 1) {
        return parts[0].substring(0, 1).toUpperCase();
    }
    
    return parts[0].substring(0, 1).toUpperCase() + parts[parts.length - 1].substring(0, 1).toUpperCase();
}

function MemberAvatar({member, style}) {
    const Style = Styles({style});
    const initials = member ? getInitials(member.name, member.email) : '';
    
    return (
        <figure className='gh-portal-avatar' style={Style.avatarContainer}>
            {initials ? (
                <span className='gh-portal-avatar-initials' style={Style.initials}>{initials}</span>
            ) : (
                <UserIcon style={Style.userIcon} />
            )}
        </figure>
    );
}

export default MemberAvatar;