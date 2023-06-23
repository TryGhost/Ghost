import AppContext from '../../../AppContext';
import CommentContextMenu from '../context-menus/CommentContextMenu';
import React, {useContext, useState} from 'react';
import {ReactComponent as MoreIcon} from '../../../images/icons/more.svg';

const MoreButton = ({comment, toggleEdit}) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const {member, admin} = useContext(AppContext);

    const toggleContextMenu = () => {
        setIsContextMenuOpen(current => !current);
    };

    const closeContextMenu = () => {
        setIsContextMenuOpen(false);
    };

    /*
     * Whether we have at least one action inside the context menu
     * (to hide the 'more' icon if we don't have any actions)
    */
    const show = (!!member && comment.status === 'published') || !!admin;

    if (!member) {
        return null;
    }

    return (
        <div className="relative" data-testid="more-button">
            {show ? <button className="outline-0" type="button" onClick={toggleContextMenu}><MoreIcon className='duration-50 gh-comments-icon gh-comments-icon-more fill-[rgba(0,0,0,0.5)] outline-0 transition ease-linear hover:fill-[rgba(0,0,0,0.75)] dark:fill-[rgba(255,255,255,0.5)] dark:hover:fill-[rgba(255,255,255,0.25)]' /></button> : null}
            {isContextMenuOpen ? <CommentContextMenu close={closeContextMenu} comment={comment} toggleEdit={toggleEdit} /> : null}
        </div>
    );
};

export default MoreButton;
