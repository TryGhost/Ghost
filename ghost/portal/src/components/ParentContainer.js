import TriggerButton from './TriggerButton';
import PopupModal from './PopupModal';
import * as Fixtures from '../test/fixtures/data';
import setupGhostApi from '../utils/api';
import {ParentContext} from './ParentContext';

const React = require('react');
const PropTypes = require('prop-types');

export default class ParentContainer extends React.Component {
    static propTypes = {
        data: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        // Setup custom trigger button handling
        this.setupCustomTriggerButton();

        this.state = {
            page: 'accountHome',
            showPopup: false,
            action: 'init:running',
            initStatus: 'running'
        };
    }

    componentDidMount() {
        const {adminUrl} = this.props.data;
        if (adminUrl) {
            this.GhostApi = setupGhostApi({adminUrl});
            this.fetchData();
        } else {
            console.error(`[Members.js] Failed to initialize, pass a valid admin url.`);
            this.setState({
                action: 'init:failed:missingAdminUrl'
            });
        }
    }

    // Fetch site and member session data with Ghost Apis
    async fetchData() {
        const {adminUrl} = this.props.data;
        this.GhostApi = setupGhostApi({adminUrl});
        try {
            const {site, member} = await this.GhostApi.init();
            this.setState({
                site,
                member,
                page: member ? 'accountHome' : 'signup',
                action: 'init:success',
                initStatus: 'success'
            });
        } catch (e) {
            console.error(`[Members.js] Failed to fetch site data, please make sure your admin url - ${adminUrl} - is correct.`);
            this.setState({
                action: 'init:failed:incorrectAdminUrl',
                initStatus: 'failed'
            });
        }
    }

    getData() {
        // Load data from fixtures for development mode
        if (process.env.REACT_APP_ADMIN_URL) {
            return {
                site: Fixtures.site,
                member: Fixtures.member.free
            };
        }
        return {
            site: this.state.site,
            member: this.state.member
        };
    }

    switchPage(page) {
        this.setState({
            page
        });
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

    getBrandColor() {
        return (this.getData().site && this.getData().site.brand && this.getData().site.brand.primaryColor) || '#3db0ef';
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
                this.setState({
                    showPopup: false
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
                await this.GhostApi.member.sendMagicLink(data);
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

    renderPopupMenu() {
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

    getActionData(action) {
        const [type, status, reason] = action.split(':');
        return {type, status, reason};
    }

    render() {
        if (this.state.initStatus === 'success' || process.env.REACT_APP_ADMIN_URL) {
            const {site, member} = this.getData();

            return (
                <ParentContext.Provider value={{
                    site,
                    member,
                    action: this.state.action,
                    brandColor: this.getBrandColor(),
                    page: this.state.page,
                    onAction: (action, data) => this.onAction(action, data)
                }}>
                    {this.renderPopupMenu()}
                    {this.renderTriggerButton()}
                </ParentContext.Provider>
            );
        }
        return null;
    }
}
