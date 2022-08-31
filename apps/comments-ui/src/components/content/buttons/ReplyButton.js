import React, {useContext} from 'react';
import AppContext from '../../../AppContext';
import {ReactComponent as ReplyIcon} from '../../../images/icons/reply.svg';

function ReplyButton(props) {
    const {member} = useContext(AppContext);

    return member ?
        (<button disabled={!!props.disabled} className={`group duration-50 flex items-center font-sans text-sm outline-0 transition-all ease-linear ${props.isReplying ? 'text-neutral-900 dark:text-[rgba(255,255,255,0.9)]' : 'text-neutral-500 hover:text-neutral-600 dark:text-[rgba(255,255,255,0.5)] dark:hover:text-[rgba(255,255,255,0.3)]'}`} onClick={props.toggleReply} data-testid="reply-button">
            <ReplyIcon className={`mr-[6px] ${props.isReplying ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : 'stroke-neutral-400 group-hover:stroke-neutral-600 dark:stroke-[rgba(255,255,255,0.5)]'} duration-50 transition ease-linear`} />ReplyButton
        </button>) : null;
}

export default ReplyButton;
