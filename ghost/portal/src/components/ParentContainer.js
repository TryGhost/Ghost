import TriggerComponent from './TriggerComponent';
import PopupMenuComponent from './PopupMenuComponent';
const setupMembersApi = require('../utils/api');
const React = require("react");
const PropTypes = require("prop-types");
export default class ParentContainer extends React.Component {
    static propTypes = {
        name: PropTypes.string,
    };

    constructor(props) {
        super(props);
        console.log("Initialized script with data", props.data);

        // Setup Members API with blog/admin URLs
        const {blogUrl, adminUrl} = props.data.site;
        this.MembersAPI = setupMembersApi({blogUrl, adminUrl});

        // Setup custom trigger button handling
        this.customTriggerButton = document.querySelector('[data-members-trigger-button]')
        this.setupCustomTriggerButton(this.customTriggerButton);

        this.state = {
            showPopup: false
        };
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
            }
            customTriggerButton.classList.add('popup-close');
            customTriggerButton.addEventListener('click', clickHandler);
        }
    }

    onSignout() {
        this.MembersAPI.signout();
    }

    onSignin(data) {
        this.MembersAPI.sendMagicLink(data);
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
                    name={this.props.name}
                    data={this.props.data}
                    onSignout={(e) => this.onSignout()}
                    onSignin={(data) => this.onSignin(data)}
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
                    onToggle= {(e) => this.onTriggerToggle()}
                    isPopupOpen={this.state.showPopup}
                    data={this.props.data}
                />
            )
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