import React, {useContext} from 'react';
import AppContext from '../AppContext';
import {ReactComponent as ReplyIcon} from '../images/icons/reply.svg';

function Reply(props) {
    const {member} = useContext(AppContext);

    return member ?
        (<button className={`flex font-sans items-center text-sm ${props.isReplying ? 'text-neutral-900 dark:text-[rgba(255,255,255,0.9)]' : 'text-neutral-400 dark:text-[rgba(255,255,255,0.5)]'}`} onClick={props.toggleReply}>
            <ReplyIcon className={`mr-[6px] ${props.isReplying ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : 'stroke-neutral-400 dark:stroke-[rgba(255,255,255,0.5)]'}`} />Reply
        </button>) : null;
}

export default Reply;
