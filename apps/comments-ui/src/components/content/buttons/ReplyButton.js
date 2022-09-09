import React, {useContext} from 'react';
import AppContext from '../../../AppContext';
import {ReactComponent as ReplyIcon} from '../../../images/icons/reply.svg';

function ReplyButton(props) {
    const {member} = useContext(AppContext);

    return member ?
        (<button disabled={!!props.disabled} type="button" className={`group duration-50 flex items-center font-sans text-sm outline-0 transition-all ease-linear ${props.isReplying ? 'text-[rgba(0,0,0,0.9)] dark:text-[rgba(255,255,255,0.9)]' : 'text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.75)] dark:text-[rgba(255,255,255,0.5)] dark:hover:text-[rgba(255,255,255,0.25)]'}`} onClick={props.toggleReply} data-testid="reply-button">
            <ReplyIcon className={`mr-[6px] ${props.isReplying ? 'fill-[rgba(0,0,0,0.9)] stroke-[rgba(0,0,0,0.9)] dark:fill-[rgba(255,255,255,0.9)] dark:stroke-[rgba(255,255,255,0.9)]' : 'stroke-[rgba(0,0,0,0.5)] group-hover:stroke-[rgba(0,0,0,0.75)] dark:stroke-[rgba(255,255,255,0.5)] dark:group-hover:stroke-[rgba(255,255,255,0.25)]'} duration-50 transition ease-linear`} />Reply
        </button>) : null;
}

export default ReplyButton;
