import React, {useContext} from 'react';
import AppContext from '../AppContext';
import {ReactComponent as ReplyIcon} from '../images/icons/reply.svg';

function Reply(props) {
    const {member} = useContext(AppContext);

    return member ?
        (<button className={`flex font-sans items-center text-sm dark:text-white ${props.isReplying ? 'text-neutral-900' : 'text-neutral-400'}`} onClick={props.toggleReply}>
            <ReplyIcon className={`mr-[6px] stroke-neutral-400 dark:stroke-white ${props.isReplying ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : ''}`} />Reply
        </button>) : null;
}

export default Reply;
