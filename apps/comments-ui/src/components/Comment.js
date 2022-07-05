import Avatar from './Avatar';
import {formatRelativeTime} from '../utils/helpers';
import {ReactComponent as MoreIcon} from '../images/icons/more.svg';
import React from 'react';
import AppContext from '../AppContext';
import AuthorContextMenu from './modals/AuthorContextMenu';

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
                        <Avatar />

                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                            <h6 className="text-xs text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                        </div>
                        {/* <h6 className="text-sm text-neutral-400 font-sans">{comment.member.bio}</h6> */}
                        {/* <div className="text-sm text-neutral-400 font-sans font-normal">
                            {formatRelativeTime(comment.created_at)}
                        </div> */}
                    </div>
                    <div className="ml-14 mb-4 font-sans leading-normal dark:text-neutral-300">
                        <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap"></p>
                    </div>

                    {/*</div>button><MoreIcon className='gh-comments-icon gh-comments-icon-more' /></button>
                    {this.state.isContextMenuOpen ? <AuthorContextMenu /> : null}*/}
                </div>
            </div>
        );
    }
}
  
export default Comment;
