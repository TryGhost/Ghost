import React from 'react';
import AppContext from '../../AppContext';

class AdminContextMenu extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};

        this.hideComment = this.hideComment.bind(this);
    }

    hideComment(event) {
        this.context.onAction('hideComment', this.props.comment);
    }

    render() {
        return (
            <button onClick={this.hideComment}>
                Hide comment
            </button>
        );
    }
}
  
export default AdminContextMenu;
