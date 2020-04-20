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

        this.initialize();

        this.state = {
            page: 'loading',
            showPopup: false,
            action: {
                name: 'loading'
            }
        };
    }

    initialize() {
        // Setup custom trigger button handling
        this.setupCustomTriggerButton();

        // Initialize site and members data
        this.loadData();
    }

    async loadData() {
        // Setup Members API with site/admin URLs
        const {adminUrl} = this.props.data;
        const siteUrl = window.location.origin;
        this.MembersAPI = setupMembersApi({siteUrl, adminUrl});
        try {
            // const {site} = await this.MembersAPI.getSiteData();
            // const member = await this.MembersAPI.getMemberData();
            const [{site}, member] = await Promise.all([this.MembersAPI.getSiteData(), this.MembersAPI.getMemberData()]);
            console.log('Setting state with', site, member);
            this.setState({
                site,
                member,
                page: member ? 'signedin' : 'signup',
                action: 'init:success'
            });
        } catch (e) {
            this.setState({
                action: {
                    name: 'init:failed'
                }
            });
        }
    }

    getData() {
        const member = this.state.member;
        const site = this.state.site;
        return {site, member};
    }

    switchPage(page) {
        this.setState({
            page
        });
    }

    setupCustomTriggerButton() {
        this.customTriggerButton = document.querySelector('[data-members-trigger-button]');

        if (this.customTriggerButton) {
            const clickHandler = (event) => {
                event.preventDefault();
                const elAddClass = this.state.showPopup ? 'popup-close' : 'popup-open';
                const elRemoveClass = this.state.showPopup ? 'popup-open' : 'popup-close';
                this.customTriggerButton.classList.add(elAddClass);
                this.customTriggerButton.classList.remove(elRemoveClass);
                this.onTriggerToggle();
            };
            this.customTriggerButton.classList.add('popup-close');
            this.customTriggerButton.addEventListener('click', clickHandler);
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
                    data={this.getData()}
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
                    data={this.getData()}
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
