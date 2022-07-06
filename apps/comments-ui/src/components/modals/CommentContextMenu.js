import React from 'react';
import AppContext from '../../AppContext';
import AdminContextMenu from './AdminContextMenu';
import AuthorContextMenu from './AuthorContextMenu';
import NotAuthorContextMenu from './NotAuthorContextMenu';

class CommentContextMenu extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};
    }

    get isAuthor() {
        return this.props.comment.member.uuid === this.context?.member?.uuid;
    }

    get isAdmin() {
        return false;
    }

    render() {
        const comment = this.props.comment;

        return (
            <div>
                {this.isAuthor ? <AuthorContextMenu comment={comment}/> : (this.isAdmin ? <AdminContextMenu comment={comment}/> : <NotAuthorContextMenu comment={comment}/>)}
            </div>
        );
    }
}
  
export default CommentContextMenu;
