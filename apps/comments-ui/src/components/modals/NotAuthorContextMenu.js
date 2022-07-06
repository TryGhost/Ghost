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
        this.close();
    }

    close() {
        this.props.close();
    }

    render() {
        return (
            <button className="text-[14px]" onClick={this.reportComment}>
                Report comment
            </button>
        );
    }
}
  
export default NotAuthorContextMenu;
