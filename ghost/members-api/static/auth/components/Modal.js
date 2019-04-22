import { Component } from 'preact';

import Pages from './Pages';

import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';
import SignupCompletePage from '../pages/SignupCompletePage';
import RequestPasswordResetPage from '../pages/RequestPasswordResetPage';
import PasswordResetSentPage from '../pages/PasswordResetSentPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import StripeSubscribePage from '../pages/StripeSubscribePage';
import { IconClose } from '../components/icons';
import StripeUpgradePage from '../pages/StripeUpgradePage';
import StripeSubscribePaymentPage from '../pages/StripeSubscribePaymentPage';

export default class Modal extends Component {
    constructor(props, context) {
        super();
        this.state = {
            error: null,
            showLoggedIn: false,
            showSpinner: false,
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

    renderSignupPage({error, stripeConfig, members, signup, closeModal, siteConfig, showSpinner}) {

        if (stripeConfig) {
            const createAccountWithSubscription = (data) => {
                this.setState({showSpinner: true});
                return members.signup(data).then((success) => {
                    return members.createSubscription(data).then((success) => {
                        this.setState({showSpinner: false});
                        window.location.hash = 'signup-complete';
                    }, (error) => {
                        this.setState({ error: "Unable to confirm payment", showSpinner: false });
                        window.location.hash = data.coupon ? `signup-payment?coupon=${data.coupon}` : "signup-payment";
                    });
                }, (error) => {
                    this.setState({ error: "Unable to signup", showSpinner: false });
                })
            };
            return <StripeSubscribePage stripeConfig={stripeConfig} error={error} hash="signup" handleSubmit={createAccountWithSubscription} handleClose={closeModal} siteConfig={siteConfig} showSpinner={showSpinner} />

        }
        return (
            <SignupPage error={error} hash="signup" handleSubmit={signup} handleClose={closeModal} showSpinner={showSpinner} />
        );
    }

    renderSignupPaymentPage({error, stripeConfig, members, signup, closeModal, siteConfig, showSpinner}) {

        const createSubscription = (data) => {
            this.setState({showSpinner: true});
            return members.createSubscription(data).then((success) => {
                this.setState({showSpinner: false});
                window.location.hash = 'signup-complete';
            }, (error) => {
                this.setState({ error: "Unable to confirm payment", showSpinner: false });
            });
        };
        return <StripeSubscribePaymentPage stripeConfig={stripeConfig} error={error} hash="signup-payment" handleSubmit={createSubscription} handleClose={closeModal} siteConfig={siteConfig} showSpinner={showSpinner} />
    }

    renderUpgradePage(props, state) {
        const { error, paymentConfig } = state;
        const { members } = this.context;
        const closeModal = () => this.close();
        const createSubscription = (data) => this.handleAction(
            members.createSubscription(data)
        );
        const stripeConfig = paymentConfig && paymentConfig.find(({adapter}) => adapter === 'stripe');
        return <StripeUpgradePage stripeConfig={stripeConfig} error={error} hash="upgrade" handleSubmit={createSubscription} handleClose={closeModal}/>
    }

    render(props, state) {
        const { containerClass, error, loadingConfig, paymentConfig, siteConfig, showLoggedIn, showSpinner } = state;
        const { members } = this.context;

        const closeModal = () => this.close();
        const clearError = () => this.setState({ error: null });

        const signup = (data) => {
            this.setState({showSpinner: true});
            return members.signup(data).then((success) => {
                this.setState({showSpinner: false});
                window.location.hash = 'signup-complete';
            }, (error) => {
                this.setState({ error, showSpinner: false });
            })
        };

        const signin = (data) => members.signin(data).then((success) => {
            this.setState({ error: null });
            const clearShowLoggedIn = () => {
                this.setState({showLoggedIn: false});
                this.close();
            }
            this.setState({showLoggedIn: true}, () => {
                window.setTimeout(clearShowLoggedIn, 1500)
            });
        }, (error) => {
            this.setState({ error });
        });

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
                <SigninPage error={error} hash="" handleSubmit={signup} showLoggedIn={showLoggedIn} />
                <SigninPage error={error} hash="signin" handleSubmit={signin} showLoggedIn={showLoggedIn} />
                {this.renderSignupPage({ error, stripeConfig, members, signup, closeModal, siteConfig, showSpinner})}
                {this.renderSignupPaymentPage({ error, stripeConfig, members, signup, closeModal, siteConfig, showSpinner})}
                {this.renderUpgradePage(props, state)}
                <SignupCompletePage error={ error } hash="signup-complete" handleSubmit={ closeModal } siteConfig={ siteConfig } />
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
