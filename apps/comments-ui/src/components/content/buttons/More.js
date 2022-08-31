import React, {useContext, useState} from 'react';
import CommentContextMenu from '../context-menus/CommentContextMenu';
import AppContext from '../../../AppContext';
import {ReactComponent as MoreIcon} from '../../../images/icons/more.svg';

const More = (props) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const {member, admin} = useContext(AppContext);

    const toggleContextMenu = () => {
        setIsContextMenuOpen(current => !current);
    };

    const closeContextMenu = () => {
        setIsContextMenuOpen(false);
    };

    const comment = props.comment;

    /*
     * Whether we have at least one action inside the context menu
     * (to hide the 'more' icon if we don't have any actions)
    */
    const show = (!!member && comment.status === 'published') || !!admin;

    if (!member) {
        return null;
    }

    return (
        <div className="relative">
            {show ? <button onClick={toggleContextMenu} className="outline-0"><MoreIcon className='duration-50 gh-comments-icon gh-comments-icon-more dark:fill-rgba(255,255,255,0.5) fill-neutral-400 outline-0 transition ease-linear hover:fill-neutral-600' /></button> : null}
            {isContextMenuOpen ? <CommentContextMenu comment={comment} close={closeContextMenu} toggleEdit={props.toggleEdit} /> : null}
        </div>
    );
};

export default More;
