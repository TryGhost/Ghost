import AppContext from '../../../../app-context';
import MemberAvatar from '../../../common/member-gravatar';
import { useContext } from 'react';
import { t } from '../../../../utils/i18n';

const UserHeader = () => {
  const { member, brandColor } = useContext(AppContext);
  const avatar = member.avatar_image;
  return (
    <header className="gh-portal-account-header mx-0 mb-8 mt-0 flex flex-col items-center [&_.gh-portal-avatar]:!mx-0 [&_.gh-portal-avatar]:!mb-2 [&_.gh-portal-avatar]:!mt-1.5">
      <MemberAvatar
        gravatar={avatar}
        style={{ userIcon: { color: brandColor, width: '56px', height: '56px', padding: '2px' } }}
      />
      <h2 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-grey-0">
        {t('Your account')}
      </h2>
    </header>
  );
};

export default UserHeader;
