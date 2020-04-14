import TriggerComponent from './TriggerComponent';
import PopupMenuComponent from './PopupMenuComponent';
const setupMembersApi = require('../utils/api');
const React = require('react');
const PropTypes = require('prop-types');
export default class ParentContainer extends React.Component {
    static propTypes = {
        data: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        console.log('Initialized script with data', props.data);

        // Setup Members API with site/admin URLs
        const {siteUrl, adminUrl} = props.data.site;
        this.MembersAPI = setupMembersApi({siteUrl, adminUrl});

        // Setup custom trigger button handling
        this.customTriggerButton = document.querySelector('[data-members-trigger-button]');
        this.setupCustomTriggerButton(this.customTriggerButton);
        const page = this.isMemberLoggedIn() ? 'signedin' : 'signin';

        this.state = {
            page,
            showPopup: false,
            action: null
        };
    }

    isMemberLoggedIn() {
        return !!this.props.data.member;
    }

    switchPage(page) {
        this.setState({
            page
        });
    }

    setupCustomTriggerButton(customTriggerButton) {
        if (customTriggerButton) {
            const clickHandler = (event) => {
                event.preventDefault();
                const elAddClass = this.state.showPopup ? 'popup-close' : 'popup-open';
                const elRemoveClass = this.state.showPopup ? 'popup-open' : 'popup-close';
                customTriggerButton.classList.add(elAddClass);
                customTriggerButton.classList.remove(elRemoveClass);
                this.onTriggerToggle();
            };
            customTriggerButton.classList.add('popup-close');
            customTriggerButton.addEventListener('click', clickHandler);
        }
    }

    resetAction() {
        this.setState({
            action: null
        });
    }

    async onAction(action, data) {
        this.setState({
            action: {
                name: action,
                isRunning: true,
                isSuccess: false,
                error: null
            }
        });
        try {
            if (action === 'signout') {
                await this.MembersAPI.signout();

                this.setState({
                    action: {
                        name: action,
                        isRunning: false,
                        isSuccess: true
                    }
                });
            }

            if (action === 'signin') {
                await this.MembersAPI.sendMagicLink(data);
                this.setState({
                    action: {
                        name: action,
                        isRunning: false,
                        isSuccess: true
                    },
                    page: 'magiclink'
                });
            }

            if (action === 'checkoutPlan') {
                const checkoutSuccessUrl = (new URL('/account/?stripe=billing-update-success', window.location.href)).href;
                const checkoutCancelUrl = (new URL('/account/?stripe=billing-update-cancel', window.location.href)).href;
                console.log('Checkout URLs', checkoutSuccessUrl, checkoutCancelUrl);
                const {plan} = data;
                await this.MembersAPI.checkoutPlan({
                    plan,
                    checkoutSuccessUrl,
                    checkoutCancelUrl
                });
            }
        } catch (e) {
            this.setState({
                action: {
                    name: action,
                    isRunning: false,
                    error: e
                }
            });
        }
    }

    onTriggerToggle() {
        let showPopup = !this.state.showPopup;
        this.setState({
            showPopup
        });
    }

    renderPopupMenu() {
        if (this.state.showPopup) {
            return (
                <PopupMenuComponent
                    data={this.props.data}
                    action={this.state.action}
                    page={this.state.page}
                    switchPage={page => this.switchPage(page)}
                    onAction={(action, data) => this.onAction(action, data)}
                />
            );
        }
        return null;
    }

    renderTriggerComponent() {
        if (!this.customTriggerButton) {
            return (
                <TriggerComponent
                    name={this.props.name}
                    onToggle= {e => this.onTriggerToggle()}
                    isPopupOpen={this.state.showPopup}
                    data={this.props.data}
                />
            );
        }

        return null;
    }

    render() {
        return (
            <div>
                {this.renderPopupMenu()}
                {this.renderTriggerComponent()}
            </div>
        );
    }
}
