import React from 'react';
import AppContext from '../AppContext';
import NotSignedInBox from './NotSignedInBox';
import Form from './Form';
import TotalComments from './TotalComments';
import Comment from './Comment';
import Pagination from './Pagination';

class CommentsBox extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const comments = !this.context.comments ? 'Loading...' : this.context.comments.map(comment => <Comment comment={comment} key={comment.id} />);

        return (
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-sans font-bold">Members discussion</h1>
                    <TotalComments />
                </div>
                <Pagination />
                <div>
                    {comments}
                </div>
                <div>
                    { this.context.member ? <Form /> : <NotSignedInBox /> }
                </div>
            </section>
        );
    }
}
  
export default CommentsBox;
