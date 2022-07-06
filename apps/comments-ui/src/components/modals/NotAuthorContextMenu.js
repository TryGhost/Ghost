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
            <div className='bg-white absolute'>
                <button onClick={this.reportComment}>
                    Report comment
                </button>
            </div>
        );
    }
}
  
export default NotAuthorContextMenu;
