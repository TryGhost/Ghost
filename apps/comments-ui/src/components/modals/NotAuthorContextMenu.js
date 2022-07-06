import React from 'react';
import AppContext from '../../AppContext';

class NotAuthorContextMenu extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};

        this.reportComment = this.reportComment.bind(this);
    }

    reportComment(event) {
        // todo
    }

    render() {
        return (
            <button onClick={this.reportComment}>
                Report comment
            </button>
        );
    }
}
  
export default NotAuthorContextMenu;
