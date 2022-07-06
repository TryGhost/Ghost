import React from 'react';
import AppContext from '../../AppContext';

class AdminContextMenu extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};

        this.deleteComment = this.deleteComment.bind(this);
    }

    deleteComment(event) {
        // todo
    }

    render() {
        return (
            <div className='bg-white absolute'>
                <button onClick={this.deleteComment}>
                    Hide comment
                </button>
            </div>
        );
    }
}
  
export default AdminContextMenu;
