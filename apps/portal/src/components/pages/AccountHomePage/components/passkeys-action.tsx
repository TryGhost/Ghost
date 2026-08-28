import AppContext from '../../../../app-context';
import { type KeyboardEvent, useContext } from 'react';
import { t } from '../../../../utils/i18n';

interface PasskeysActionContext {
  doAction: (action: string, data: { page: string; lastPage: string }) => unknown;
}

const PasskeysAction = () => {
  const { doAction } = useContext(AppContext) as PasskeysActionContext;
  const openPasskeys = () => {
    doAction('switchPage', {
      page: 'accountPasskeys',
      lastPage: 'accountHome',
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPasskeys();
    }
  };

  return (
    <section
      className="gh-portal-list-clickable"
      role="button"
      tabIndex={0}
      onClick={openPasskeys}
      onKeyDown={handleKeyDown}
    >
      <div className="gh-portal-list-detail">
        <h3>{t('Passkeys')}</h3>
        <p>{t('Manage your sign-in methods')}</p>
      </div>
      <span aria-hidden="true" className="gh-portal-list-action" data-test-button="manage-passkeys">
        {t('Manage')}
      </span>
    </section>
  );
};

export default PasskeysAction;
