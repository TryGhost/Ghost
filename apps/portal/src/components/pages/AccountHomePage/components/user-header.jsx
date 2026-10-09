import AppContext from '../../../../app-context';
import MemberAvatar from '../../../common/member-gravatar';
import { useContext } from 'react';
import { t } from '../../../../utils/i18n';

const UserHeader = () => {
  const { member, brandColor } = useContext(AppContext);
  const avatar = member.avatar_image;
  return (
    <header className="mx-0 mt-0 mb-8 flex flex-col items-center">
      <MemberAvatar
        className="mx-0 mt-1.5 mb-2"
        gravatar={avatar}
        style={{ userIcon: { color: brandColor, width: '56px', height: '56px', padding: '2px' } }}
      />
      <h2 className="text-center leading-[1.1em] text-pretty text-black">{t('Your account')}</h2>
    </header>
  );
};

export default UserHeader;
