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
            initStatus: 'running',
            lastPage: null
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleCustomTriggerClassUpdate();
        }
    }

    handleCustomTriggerClassUpdate() {
        const popupOpenClass = 'gh-members-popup-open';
        const popupCloseClass = 'gh-members-popup-close';
        if (this.customTriggerButton) {
            const elAddClass = this.state.showPopup ? popupOpenClass : popupCloseClass;
            const elRemoveClass = this.state.showPopup ? popupCloseClass : popupOpenClass;
            this.customTriggerButton.classList.add(elAddClass);
            this.customTriggerButton.classList.remove(elRemoveClass);
        }
    }

    getStripeUrlParam() {
        const url = new URL(window.location);
        return url.searchParams.get('stripe');
    }

    componentDidMount() {
        this.fetchData();
    }

    getDefaultPage({member = this.state.member, stripeParam} = {}) {
        // Loads default page and popup state for local UI testing
        if (process.env.NODE_ENV === 'development') {
            return {
                page: process.env.REACT_APP_DEFAULT_PAGE || 'signup',
                showPopup: true
            };
        }
        if (!member && stripeParam === 'success') {
            return {page: 'magiclink', showPopup: true};
        }
        if (member) {
            return {
                page: member.paid ? 'paidAccountHome' : 'accountHome'
            };
        }
        return {
            page: 'signup'
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
        const popupCloseClass = 'gh-members-popup-close';
        this.customTriggerButton = document.querySelector(customTriggerSelector);

        if (this.customTriggerButton) {
            const clickHandler = (event) => {
                event.preventDefault();
                this.onAction('togglePopup');
            };
            this.customTriggerButton.classList.add(popupCloseClass);
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
                    page: data.page,
                    lastPage: data.lastPage || null
                });
            } else if (action === 'togglePopup') {
                this.setState({
                    showPopup: !this.state.showPopup
                });
            } else if (action === 'back') {
                if (this.state.lastPage) {
                    this.setState({
                        page: this.state.lastPage
                    });
                }
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
                const {plan, email, name} = data;
                if (plan.toLowerCase() === 'free') {
                    await this.GhostApi.member.sendMagicLink(data);
                } else {
                    await this.GhostApi.member.checkoutPlan({plan, email, name});
                }
                this.setState({
                    action: 'signup:success',
                    page: 'magiclink'
                });
            } else if (action === 'checkoutPlan') {
                const {plan} = data;
                await this.GhostApi.member.checkoutPlan({
                    plan
                });
            } else if (action === 'updatePlan') {
                const {plan, subscriptionId} = data;
                await this.GhostApi.member.updateSubscription({
                    planName: plan, subscriptionId
                });
            } else if (action === 'editBilling') {
                await this.GhostApi.member.editBilling();
            } else if (action === 'updateMember') {
                const {email, name, subscribed} = data;
                const member = await this.GhostApi.member.update({email, name, subscribed});
                if (!member) {
                    this.setState({
                        action: 'updateMember:failed'
                    });
                } else {
                    this.setState({
                        action: 'updateMember:success',
                        member: member
                    });
                }
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
                    lastPage: this.state.lastPage,
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
