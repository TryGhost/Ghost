import TriggerButton from './TriggerButton';
import PopupModal from './PopupModal';
import setupGhostApi from '../utils/api';
import {ParentContext} from './ParentContext';

const React = require('react');

export default class ParentContainer extends React.Component {

    constructor(props) {
        super(props);

        // Setup custom trigger button handling
        this.setupCustomTriggerButton();

        this.state = {
            page: 'loading',
            showPopup: false,
            action: 'init:running',
            initStatus: 'running'
        };
    }

    getStripeUrlParam() {
        const url = new URL(window.location);
        return url.searchParams.get('stripe');
    }

    componentDidMount() {
        this.fetchData();
    }

    getDefaultPage({member = this.state.member, stripeParam} = {}) {
        // Change page here for testing local UI testing
        if (process.env.NODE_ENV === 'development') {
            return {page: 'magiclink'};
        }
        if (!member && stripeParam === 'success') {
            return {page: 'magiclink', showPopup: true};
        }
        return {
            page: member ? 'accountHome' : 'signup'
        };
    }

    // Fetch site and member session data with Ghost Apis
    async fetchData() {
        try {
            this.GhostApi = setupGhostApi();
            const {site, member} = await this.GhostApi.init();
            const stripeParam = this.getStripeUrlParam();
            const {page, showPopup = false} = this.getDefaultPage({member, stripeParam});
            this.setState({
                site,
                member,
                page,
                showPopup,
                action: 'init:success',
                initStatus: 'success'
            });
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Members.js] Failed to initialize`);
            /* eslint-enable no-console */
            this.setState({
                action: 'init:failed',
                initStatus: 'failed'
            });
        }
    }

    setupCustomTriggerButton() {
        const customTriggerSelector = '[data-members-trigger-button]';
        this.customTriggerButton = document.querySelector(customTriggerSelector);

        if (this.customTriggerButton) {
            const clickHandler = (event) => {
                event.preventDefault();
                const elAddClass = this.state.showPopup ? 'popup-close' : 'popup-open';
                const elRemoveClass = this.state.showPopup ? 'popup-open' : 'popup-close';
                this.customTriggerButton.classList.add(elAddClass);
                this.customTriggerButton.classList.remove(elRemoveClass);
                this.onAction('togglePopup');
            };
            this.customTriggerButton.classList.add('popup-close');
            this.customTriggerButton.addEventListener('click', clickHandler);
        }
    }

    getActionData(action) {
        const [type, status, reason] = action.split(':');
        return {type, status, reason};
    }

    getBrandColor() {
        return (this.state.site && this.state.site.brand && this.state.site.brand.primaryColor) || '#3db0ef';
    }

    async onAction(action, data) {
        this.setState({
            action: `${action}:running`
        });
        try {
            if (action === 'switchPage') {
                this.setState({
                    page: data
                });
            } else if (action === 'togglePopup') {
                this.setState({
                    showPopup: !this.state.showPopup
                });
            } else if (action === 'closePopup') {
                const {page: defaultPage} = this.getDefaultPage();
                this.setState({
                    showPopup: false,
                    page: this.state.page === 'magiclink' ? defaultPage : this.state.page
                });
            } else if (action === 'signout') {
                await this.GhostApi.member.signout();
                this.setState({
                    action: 'signout:success'
                });
            } else if (action === 'signin') {
                await this.GhostApi.member.sendMagicLink(data);
                this.setState({
                    action: 'signin:success',
                    page: 'magiclink'
                });
            } else if (action === 'signup') {
                const {plan, email} = data;
                if (plan.toLowerCase() === 'free') {
                    await this.GhostApi.member.sendMagicLink(data);
                } else {
                    await this.GhostApi.member.checkoutPlan({plan, email});
                }
                this.setState({
                    action: 'signup:success',
                    page: 'magiclink'
                });
            } else if (action === 'checkoutPlan') {
                const checkoutSuccessUrl = (new URL('/account/?stripe=billing-update-success', window.location.href)).href;
                const checkoutCancelUrl = (new URL('/account/?stripe=billing-update-cancel', window.location.href)).href;
                const {plan} = data;
                await this.GhostApi.member.checkoutPlan({
                    plan,
                    checkoutSuccessUrl,
                    checkoutCancelUrl
                });
            }
        } catch (e) {
            this.setState({
                action: `${action}:failed`
            });
        }
    }

    renderPopup() {
        if (this.state.showPopup) {
            return (
                <PopupModal />
            );
        }
        return null;
    }

    renderTriggerButton() {
        if (!this.customTriggerButton) {
            return (
                <TriggerButton
                    isPopupOpen={this.state.showPopup}
                />
            );
        }

        return null;
    }

    render() {
        if (this.state.initStatus === 'success') {
            const {site, member} = this.state;

            return (
                <ParentContext.Provider value={{
                    site,
                    member,
                    action: this.state.action,
                    brandColor: this.getBrandColor(),
                    page: this.state.page,
                    onAction: (action, data) => this.onAction(action, data)
                }}>
                    {this.renderPopup()}
                    {this.renderTriggerButton()}
                </ParentContext.Provider>
            );
        }
        return null;
    }
}
