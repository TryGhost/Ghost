import React, {useContext} from 'react';
import AppContext from '../../AppContext';
import AdminContextMenu from './AdminContextMenu';
import AuthorContextMenu from './AuthorContextMenu';
import NotAuthorContextMenu from './NotAuthorContextMenu';

const CommentContextMenu = (props) => {
    const {member, admin} = useContext(AppContext);
    const comment = props.comment;
    const isAuthor = member && comment.member?.uuid === member?.uuid;
    const isAdmin = !!admin;

    let contextMenu = null;
    if (comment.status === 'published') {
        if (isAuthor) {
            contextMenu = <AuthorContextMenu comment={comment} close={props.close} toggleEdit={props.toggleEdit} />;
        } else {
            if (isAdmin) {
                contextMenu = <AdminContextMenu comment={comment} close={props.close}/>;
            } else {
                contextMenu = <NotAuthorContextMenu comment={comment} close={props.close}/>;
            }
        }
    } else {
        if (isAdmin) {
            contextMenu = <AdminContextMenu comment={comment} close={props.close}/>;
        } else {
            return null;
        }
    }

    return (
        <div className="min-w-[170px] bg-white absolute font-sans rounded py-3 px-4 shadow-lg text-sm whitespace-nowrap z-10 dark:bg-zinc-900 dark:text-white">
            {contextMenu}
        </div>
    );
};

export default CommentContextMenu;
