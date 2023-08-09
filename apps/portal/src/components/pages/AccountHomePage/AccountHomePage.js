import React from 'react';
import AppContext from '../../../AppContext';
import {getSupportAddress} from '../../../utils/helpers';

import AccountFooter from './components/AccountFooter';
import AccountMain from './components/AccountMain';

export default class AccountHomePage extends React.Component {
    static contextType = AppContext;

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
            this.context.onAction('switchPage', {
                page: 'signin',
                pageData: {
                    redirect: window.location.href // This includes the search/fragment of the URL (#/portal/account) which is missing from the default referer header
                }
            });
        }
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    render() {
        const {member, site, t} = this.context;
        const supportAddress = getSupportAddress({site});
        if (!member) {
            return null;
        }
        return (
            <div className='gh-portal-account-wrapper'>
                <AccountMain />
                <AccountFooter
                    onClose={() => this.context.onAction('closePopup')}
                    handleSignout={e => this.handleSignout(e)}
                    supportAddress={supportAddress}
                    t={t}
                />
            </div>
        );
    }
}
