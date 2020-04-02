import TriggerComponent from './TriggerComponent';
import PopupMenuComponent from './PopupMenuComponent';
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
    }

    componentDidMount() {
        console.log("Loaded Members Data", this.props.data);
    }

    onTriggerToggle() {
        let showPopup = !this.state.showPopup;
        this.setState({
            showPopup
        }, () => {
            setTimeout(() => {
                if (showPopup) {
                    // Trigger member signout method
                    const querySelector = document.querySelectorAll('iframe')[0] && document.querySelectorAll('iframe')[0].contentWindow.document.body.querySelectorAll('[data-members-signout]')
                    if (querySelector) {
                        window.handleMembersSignout && window.handleMembersSignout(querySelector);
                    }
                }
            }, 500 )
        });
    }

    renderPopupMenu() {
        if (this.state.showPopup) {
            return (
                <PopupMenuComponent name={this.props.name} data={this.props.data} />
            );
        }
        return null;
    }

    renderTriggerComponent() {
        return (
            <TriggerComponent name={this.props.name} onToggle= {(e) => this.onTriggerToggle()} isPopupOpen={this.state.showPopup} data={this.props.data} />
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