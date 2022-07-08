import React, {useContext} from 'react';
import AppContext from '../../AppContext';
import AdminContextMenu from './AdminContextMenu';
import AuthorContextMenu from './AuthorContextMenu';
import NotAuthorContextMenu from './NotAuthorContextMenu';

const CommentContextMenu = (props) => {
    const {member, admin} = useContext(AppContext);
    const comment = props.comment;
    const isAuthor = comment.member.uuid === member?.uuid;
    const isAdmin = !!admin;

    return (
        <div className="min-w-[170px] bg-white absolute font-sans rounded py-3 px-4 shadow-lg text-sm whitespace-nowrap z-10 dark:bg-zinc-900 dark:text-white">
            {isAuthor && comment.status === 'published' ? <AuthorContextMenu comment={comment} close={props.close} toggleEdit={props.toggleEdit} /> : (isAdmin ? <AdminContextMenu comment={comment} close={props.close}/> : <NotAuthorContextMenu comment={comment} close={props.close}/>)}
        </div>
    );
};

export default CommentContextMenu;
