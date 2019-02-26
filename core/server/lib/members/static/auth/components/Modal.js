import { Component } from 'preact';

import Pages from './Pages';

import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';
import RequestPasswordResetPage from '../pages/RequestPasswordResetPage';
import PasswordResetSentPage from '../pages/PasswordResetSentPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import StripeSubscribePage from '../pages/StripeSubscribePage';
import { IconClose } from '../components/icons';
import StripeUpgradePage from '../pages/StripeUpgradePage';

export default class Modal extends Component {
    constructor(props, context) {
        super();
        this.state = {
            error: null,
            containerClass: 'gm-page-overlay'
        }
    }

    loadConfig() {
        if (this.state.loadingConfig) {
            return;
        }
        this.context.members.getConfig().then(({paymentConfig, siteConfig}) => {
            this.setState({ paymentConfig, siteConfig, loadingConfig: false });
        }).catch((error) => {
            this.setState({ error, loadingConfig: false });
        });
    }

    componentWillMount() {
        this.loadConfig();
    }

    handleAction(promise) {
        promise.then((success) => {
            this.close(success);
        }, (error) => {
            this.setState({ error });
        });
    }

    renderSignupPage({error, stripeConfig, members, signup, closeModal, siteConfig}) {

        if (stripeConfig) {
            const createAccountWithSubscription = (data) => members.signup(data).then((success) => {
                members.createSubscription(data).then((success) => {
                    this.close();
                }, (error) => {
                    this.setState({ error: "Unable to confirm payment" });
                });
            }, (error) => {
                this.setState({ error: "Unable to signup" });
            });
            return <StripeSubscribePage stripeConfig={stripeConfig} error={error} hash="signup" handleSubmit={createAccountWithSubscription} handleClose={closeModal} siteConfig={siteConfig} />

        }
        return (
            <SignupPage error={error} hash="signup" handleSubmit={signup} handleClose={closeModal} />
        );
    }

    renderUpgradePage(props, state) {
        const { error, paymentConfig } = state;
        const { members } = this.context;
        const closeModal = () => this.close();
        const createSubscription = (data) => this.handleAction(
            members.createSubscription(data)
        );
        const stripeConfig = paymentConfig && paymentConfig.find(({adapter}) => adapter === 'stripe');
        return <StripeUpgradePage frameLocation={props.frameLocation} stripeConfig={stripeConfig} error={error} hash="upgrade" handleSubmit={createSubscription} handleClose={closeModal}/>

    }

    render(props, state) {
        const { containerClass, error, loadingConfig, paymentConfig, siteConfig } = state;
        const { members } = this.context;

        const closeModal = () => this.close();
        const clearError = () => this.setState({ error: null });

        const signin = (data) => this.handleAction(members.signin(data));
        const signup = (data) => this.handleAction(members.signup(data));
        const requestReset = (data) => members.requestPasswordReset(data).then((success) => {
            window.location.hash = 'password-reset-sent';
        }, (error) => {
            this.setState({ error });
        });
        const resetPassword = (data) => this.handleAction(members.resetPassword(data));
        const stripeConfig = paymentConfig && paymentConfig.find(({ adapter }) => adapter === 'stripe');

        if (loadingConfig) {
            return (
                <Pages className={containerClass} onChange={clearError} onClick={closeModal}>
                    Loading...
                </Pages>
            );
        }
        return (
            <Pages className={containerClass} onChange={clearError} onClick={closeModal} stripeConfig={stripeConfig} siteConfig={siteConfig}>
                <SigninPage error={error} hash="" handleSubmit={signup} />
                <SigninPage error={error} hash="signin" handleSubmit={signin} />
                {this.renderSignupPage({error, stripeConfig, members, signup, closeModal, siteConfig})}
                {this.renderUpgradePage(props, state)}
                <RequestPasswordResetPage error={error} hash="request-password-reset" handleSubmit={requestReset} />
                <PasswordResetSentPage error={ error } hash="password-reset-sent" handleSubmit={closeModal} />
                <ResetPasswordPage error={error} hash="reset-password" handleSubmit={resetPassword} />
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
