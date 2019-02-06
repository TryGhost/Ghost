import { Component } from 'preact';

import Pages from './Pages';

import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';
import RequestPasswordResetPage from '../pages/RequestPasswordResetPage';
import PasswordResetSentPage from '../pages/PasswordResetSentPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

export default class Modal extends Component {
    constructor(props, context) {
        super();
        this.state = {
            error: null,
            containerClass: 'gm-page-overlay'
        }
    }

    handleAction(promise) {
        promise.then((success) => {
            this.close(success);
        }, (error) => {
            this.setState({error});
        });
    }

    render(props, state) {
        const { queryToken } = props;
        const { containerClass, error } = state;
        const { members } = this.context;

        const closeModal = () => this.close();
        const clearError = () => this.setState({error: null});

        const signin = (data) => this.handleAction(members.signin(data));
        const signup = (data) => this.handleAction(members.signup(data));
        const requestReset = (data) => this.handleAction(members.requestPasswordReset(data));
        const resetPassword = (data) => this.handleAction(members.resetPassword(data));

        return (
            <Pages className={containerClass} onChange={clearError} onClick={closeModal}>
                <SignupPage error={error} hash="" handleSubmit={signup} handleClose={closeModal}/>
                <SignupPage error={error} hash="signup" handleSubmit={signup} handleClose={closeModal}/>
                <SigninPage error={error} hash="signin" handleSubmit={signin} handleClose={closeModal}/>
                <RequestPasswordResetPage error={error} hash="request-password-reset" handleSubmit={requestReset} handleClose={closeModal}/>
                <PasswordResetSentPage error={error} hash="password-reset-sent" handleSubmit={requestReset} handleClose={closeModal}/>
                <ResetPasswordPage error={error} hash="reset-password" handleSubmit={resetPassword} handleClose={closeModal}/>
            </Pages>
        );
    }

    close(success) {
        this.setState({
            containerClass: 'gm-page-overlay close'
        });

        window.setTimeout(() => {
            this.setState({
                containerClass: 'gm-page-overlay'
            });
            window.parent.postMessage({
                msg: 'pls-close-auth-popup',
                success
            }, '*');
        }, 700);
    }
}
