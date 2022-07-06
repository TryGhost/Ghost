import {formatRelativeTime} from '../utils/helpers';
import React from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';
import Like from './Like';
// import Reply from './Reply';
import More from './More';
import EditForm from './EditForm';
import Replies from './Replies';

class Comment extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            isContextMenuOpen: false,
            isInEditMode: false
        };

        this.toggleContextMenu = this.toggleContextMenu.bind(this);
        this.toggleEditMode = this.toggleEditMode.bind(this);
    }

    toggleContextMenu() {
        this.setState(state => ({
            isContextMenuOpen: !state.isContextMenuOpen
        }));
    }

    toggleEditMode() {
        this.setState(state => ({
            isInEditMode: !state.isInEditMode
        }));
    }

    /**
     * Whether we have at least one action inside the context menu
     * (to hide the 'more' icon if we don't have any actions)
     */
    get hasMoreContextMenu() {
        return (!!this.context.member && this.props.comment.status === 'published') || !!this.context.admin;
    }

    render() {
        const comment = this.props.comment;
        const html = {__html: comment.html};

        if (comment.status !== 'published') {
            html.__html = '<i>This comment has been removed.</i>';
        }

        if (this.state.isInEditMode) {
            return (
                <EditForm value={html} comment={comment} toggle={this.toggleEditMode} />
            );
        } else {
            return (
                <div className="flex mb-10">
                    <div>
                        <div className="flex mb-2 space-x-4 justify-start items-center">
                            <Avatar comment={comment} />
                            <div>
                                <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                                <h6 className="text-xs text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                            </div>
                        </div>
                        <div className="ml-14 mb-2.5 pr-4 font-sans leading-normal dark:text-neutral-300">
                            <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap"></p>
                        </div>

                        <div className="ml-14 flex gap-5">
                            <Like comment={comment} />

                            {comment.replies && comment.replies.length > 0 && <Replies replies={comment.replies} />}
                            {/* <Reply comment={comment} /> */}

                            <More comment={comment} show={this.hasMoreContextMenu} toggleEdit={this.toggleEditMode} />
                        </div>
                    </div>
                </div>
            );
        }
    }
}

export default Comment;
