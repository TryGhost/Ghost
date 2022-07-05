import React from 'react';
import AppContext from '../../AppContext';

class Form extends React.Component {
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
                <button>
                    Edit
                </button>
                <button onClick={this.deleteComment}>
                    Delete
                </button>
            </div>
        );
    }
}
  
export default Form;
