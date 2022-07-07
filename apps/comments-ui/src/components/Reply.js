import React, {useContext} from 'react';
import AppContext from '../AppContext';
import {ReactComponent as ReplyIcon} from '../images/icons/reply.svg';

function Reply(props) {
    const {member} = useContext(AppContext);

    return member ?
        (<button className="flex font-sans items-center dark:text-white" onClick={props.toggleReply}>
            <ReplyIcon className={`mr-[6px] stroke-dark dark:stroke-white ${props.isReplying ? 'fill-black dark:fill-white' : ''}`} />Reply
        </button>) : null;
}

export default Reply;
