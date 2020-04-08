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
        this.state = {
            showPopup: false
        };
        console.log("Initialized script with data", props.data);
        const {blogUrl, adminUrl} = props.data.site;
        this.MembersAPI = setupMembersApi({blogUrl, adminUrl});
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
        return (
            <TriggerComponent
                name={this.props.name}
                onToggle= {(e) => this.onTriggerToggle()}
                isPopupOpen={this.state.showPopup}
                data={this.props.data}
            />
        )
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