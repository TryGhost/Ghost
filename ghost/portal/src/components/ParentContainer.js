import TriggerButton from './TriggerButton';
import PopupMenu from './PopupMenu';
import PopupModal from './PopupModal';
import * as Fixtures from '../test/fixtures/data';
import Api from '../utils/api';

const React = require('react');
const PropTypes = require('prop-types');
export default class ParentContainer extends React.Component {
    static propTypes = {
        data: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            page: 'magiclink',
            showPopup: false,
            action: {
                name: 'loading'
            }
        };

        this.initialize();
    }

    componentDidMount() {
        // Initialize site and members data

        this.loadData();
    }

    initialize() {
        // Setup custom trigger button handling
        this.setupCustomTriggerButton();
    }

    async loadData() {
        // Setup Members API with site/admin URLs
        const {adminUrl} = this.props.data;
        const siteUrl = window.location.origin;
        this.MembersAPI = Api({siteUrl, adminUrl});
        try {
            const [{site}, member] = await Promise.all([this.MembersAPI.site.read(), this.MembersAPI.member.sessionData()]);
            console.log('Initialized Members.js with', site, member);
            this.setState({
                site,
                member,
                page: member ? 'accountHome' : 'signup',
                action: 'init:success'
            });
        } catch (e) {
            console.log('Failed state fetch', e);
            this.setState({
                action: {
                    name: 'init:failed'
                }
            });
        }
    }

    getData() {
        const member = process.env.REACT_APP_ADMIN_URL ? Fixtures.member.free : this.state.member;
        const site = process.env.REACT_APP_ADMIN_URL ? Fixtures.site : this.state.site;

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

    getBrandColor() {
        return this.getData().site && this.getData().site.brand && this.getData().site.brand.primaryColor;
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
            if (action === 'closePopup') {
                this.setState({
                    showPopup: false
                });
            } else if (action === 'signout') {
                await this.MembersAPI.member.signout();

                this.setState({
                    action: {
                        name: action,
                        isRunning: false,
                        isSuccess: true
                    }
                });
            }

            if (action === 'signin') {
                await this.MembersAPI.member.sendMagicLink(data);
                this.setState({
                    action: {
                        name: action,
                        isRunning: false,
                        isSuccess: true
                    },
                    page: 'magiclink'
                });
            }

            if (action === 'signup') {
                await this.MembersAPI.member.sendMagicLink(data);
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
                const {plan} = data;
                await this.MembersAPI.member.checkoutPlan({
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
            if (this.state.page === 'accountHome') {
                return (
                    <PopupMenu
                        data={this.getData()}
                        action={this.state.action}
                        onToggle= {e => this.onTriggerToggle()}
                        page={this.state.page}
                        switchPage={page => this.switchPage(page)}
                        onAction={(action, data) => this.onAction(action, data)}
                        brandColor = {this.getBrandColor()}
                    />
                );
            }
            return (
                <PopupModal
                    data={this.getData()}
                    action={this.state.action}
                    onToggle= {e => this.onTriggerToggle()}
                    page={this.state.page}
                    switchPage={page => this.switchPage(page)}
                    onAction={(action, data) => this.onAction(action, data)}
                    brandColor = {this.getBrandColor()}
                />
            );
        }
        return null;
    }

    renderTriggerButton() {
        if (!this.customTriggerButton) {
            return (
                <TriggerButton
                    name={this.props.name}
                    onToggle= {e => this.onTriggerToggle()}
                    isPopupOpen={this.state.showPopup}
                    data={this.getData()}
                    brandColor = {this.getBrandColor()}
                />
            );
        }

        return null;
    }

    render() {
        return (
            <>
                {this.renderPopupMenu()}
                {this.renderTriggerButton()}
            </>
        );
    }
}
