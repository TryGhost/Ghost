import {formatRelativeTime} from '../utils/helpers';
import {ReactComponent as MoreIcon} from '../images/icons/more.svg';
import React from 'react';
import AppContext from '../AppContext';
import CommentContextMenu from './modals/CommentContextMenu';
import Avatar from './Avatar';

class Comment extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            isContextMenuOpen: false
        };

        this.toggleContextMenu = this.toggleContextMenu.bind(this);
    }

    toggleContextMenu() {
        this.setState(state => ({
            isContextMenuOpen: !state.isContextMenuOpen
        }));
    }

    render() {
        const comment = this.props.comment;

        const html = {__html: comment.html};

        return (
            <div className="flex mb-4">
                <div>
                    <div className="flex mb-2 space-x-4 justify-start items-center">
                        <Avatar comment={comment} />
                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                            <h6 className="text-xs text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                        </div>
                    </div>
                    <div className="ml-14 mb-4 font-sans leading-normal dark:text-neutral-300">
                        <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap"></p>
                    </div>
                    <div className="ml-14">
                        <button onClick={this.toggleContextMenu}><MoreIcon className='gh-comments-icon gh-comments-icon-more' /></button>
                        {this.state.isContextMenuOpen ? <CommentContextMenu comment={comment} /> : null}
                    </div>
                </div>
            </div>
        );
    }
}
  
export default Comment;
