import CommentContextMenu from '../context-menus/CommentContextMenu';
import {Comment, useAppContext} from '../../../AppContext';
import {ReactComponent as MoreIcon} from '../../../images/icons/more.svg';
import {useState} from 'react';

type Props = {
    comment: Comment;
    toggleEdit: () => void;
};

const MoreButton: React.FC<Props> = ({comment, toggleEdit}) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const {member, admin, pagination, comments} = useAppContext();
    const isAdmin = !!admin;

    const toggleContextMenu = () => {
        setIsContextMenuOpen(current => !current);
    };

    const closeContextMenu = () => {
        setIsContextMenuOpen(false);
    };

    // Check if this is the last comment and there's no more pagination
    const isLastComment = (!pagination || pagination.total <= pagination.page * pagination.limit) && 
                         comments[comments.length - 1]?.id === comment.id;

    const show = (!!member && comment.status === 'published') || isAdmin;

    if (!show) {
        return null;
    }

    return (
        <div data-testid="more-button">
            <button className="outline-0" type="button" onClick={toggleContextMenu}>
                <MoreIcon className={`duration-50 gh-comments-icon gh-comments-icon-more outline-0 transition ease-linear hover:fill-black/75 dark:hover:fill-white/75 ${isContextMenuOpen ? 'fill-black/75 dark:fill-white/75' : 'fill-black/50 dark:fill-white/60'}`} />
            </button>
            {isContextMenuOpen ? <CommentContextMenu close={closeContextMenu} comment={comment} isLastComment={isLastComment} toggleEdit={toggleEdit} /> : null}
        </div>
    );
};

export default MoreButton;
