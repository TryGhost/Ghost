import React from 'react';
import AppContext from '../../../app-context';
import { getSupportAddress, hasCustomFieldsEnabled } from '../../../utils/helpers';

import AccountFooter from './components/account-footer';
import AccountMain from './components/account-main';
import { isSigninAllowed } from '../../../utils/helpers';

export default class AccountHomePage extends React.Component {
  static contextType = AppContext;

  componentDidMount() {
    const { member, site } = this.context;

    if (!isSigninAllowed({ site })) {
      this.context.doAction('signout');
    }

    if (!member) {
      this.context.doAction('switchPage', {
        page: 'signin',
        pageData: {
          redirect: window.location.href, // This includes the search/fragment of the URL (#/portal/account) which is missing from the default referer header
        },
      });
      return;
    }

    // Asked for here, ahead of the settings page that shows them, so that page draws
    // whole rather than growing when the site answers.
    if (hasCustomFieldsEnabled({ site })) {
      this.context.doAction('loadCustomFields');
    }
  }

  handleSignout(e) {
    e.preventDefault();
    this.context.doAction('signout');
  }

  render() {
    const { member, site } = this.context;
    const supportAddress = getSupportAddress({ site });
    if (!member) {
      return null;
    }
    if (!isSigninAllowed({ site })) {
      return null;
    }
    return (
      <div className="gh-portal-account-wrapper">
        <AccountMain />
        <AccountFooter
          onClose={() => this.context.doAction('closePopup')}
          handleSignout={(e) => this.handleSignout(e)}
          supportAddress={supportAddress}
        />
      </div>
    );
  }
}
