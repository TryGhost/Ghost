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

    onTriggerToggle() {
        this.setState({
            showPopup: !this.state.showPopup
        });
    }

    renderPopupMenu() {
        if (this.state.showPopup) {
            return (
                <PopupMenuComponent name={this.props.name} />
            );
        }
        return null;
    }

    renderTriggerComponent() {
        return (
            <TriggerComponent name={this.props.name} onToggle= {(e) => this.onTriggerToggle()} isPopupOpen={this.state.showPopup} />
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