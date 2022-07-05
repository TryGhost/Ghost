import React from 'react';
import AppContext from '../AppContext';
import NotSignedInBox from './NotSignedInBox';
import Form from './Form';

class CommentsBox extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <section>
                { this.context.member ? <Form /> : <NotSignedInBox /> }
            </section>
        );
    }
}
  
export default CommentsBox;
