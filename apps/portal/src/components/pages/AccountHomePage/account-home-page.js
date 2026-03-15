import React from 'react';
import AppContext from '../../../app-context';
import {getSupportAddress} from '../../../utils/helpers';

import AccountFooter from './components/account-footer';
import AccountMain from './components/account-main';
import {isSigninAllowed} from '../../../utils/helpers';

export default class AccountHomePage extends React.Component {
    static contextType = AppContext;

    componentDidMount() {
        const {member, site} = this.context;

        if (!isSigninAllowed({site})) {
            this.context.doAction('signout');
        }

        if (!member) {
            this.context.doAction('switchPage', {
                page: 'signin',
                pageData: {
                    redirect: window.location.href // This includes the search/fragment of the URL (#/portal/account) which is missing from the default referer header
                }
            });
        }
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.doAction('signout');
    }

    render() {
        const {member, site} = this.context;
        const supportAddress = getSupportAddress({site});
        if (!member) {
            return null;
        }
        if (!isSigninAllowed({site})) {
            return null;
        }
        return (
            <div className='gh-portal-account-wrapper'>
                <AccountMain />
                <AccountFooter
                    onClose={() => this.context.doAction('closePopup')}
                    handleSignout={e => this.handleSignout(e)}
                    supportAddress={supportAddress}
                />
            </div>
        );
    }
}
