import React, {useState} from 'react';
import {ReactComponent as ReplyIcon} from '../images/icons/reply.svg';

function Reply() {
    const [replied, setReplied] = useState(false);

    const toggleReply = () => {
        setReplied(!replied);
    };

    return (
        <button className="flex font-sans items-center dark:text-white" onClick={toggleReply}>
            <ReplyIcon className={`mr-[6px] stroke-dark dark:stroke-white ${replied ? 'fill-black dark:fill-white' : ''}`} />Reply
        </button>
    );
}

export default Reply;
