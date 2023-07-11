import AppContext from '../../../../AppContext';
import MemberAvatar from '../../../common/MemberGravatar';
import React, {useContext} from 'react';

const UserHeader = () => {
    const {member, brandColor, t} = useContext(AppContext);
    const avatar = member.avatar_image;
    return (
        <header className='gh-portal-account-header'>
            <MemberAvatar gravatar={avatar} style={{userIcon: {color: brandColor, width: '56px', height: '56px', padding: '2px'}}} />
            <h2 className="gh-portal-main-title">{t('Your account')}</h2>
        </header>
    );
};

export default UserHeader;
