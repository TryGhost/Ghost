import AppContext from '../../app-context';
import { useContext } from 'react';
import { canShowSignupGiftPromotion } from '../../utils/gift-subscriptions';
import { t } from '../../utils/i18n';

const SignupGiftPromotion = ({ className, lastPage, showSeparator = false }) => {
  const { brandColor, doAction, site } = useContext(AppContext);

  if (!canShowSignupGiftPromotion({ site })) {
    return null;
  }

  const promotion = (
    <>
      {showSeparator && (
        <span aria-hidden="true" className="gh-portal-signup-message-separator">
          &middot;
        </span>
      )}
      <div>{t('Buying for someone else?')}</div>
      <button
        data-test-button="gift-switch"
        data-testid="gift-switch"
        className="gh-portal-btn gh-portal-btn-link"
        style={{ color: brandColor }}
        onClick={() => doAction('switchPage', { page: 'gift', lastPage })}
      >
        <span>{t('Gift a membership')}</span>
      </button>
    </>
  );

  if (className) {
    return <div className={className}>{promotion}</div>;
  }

  return promotion;
};

export default SignupGiftPromotion;
