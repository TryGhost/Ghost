import {formatRelativeTime} from '../utils/helpers';
import React, {useContext, useState} from 'react';
import Avatar from './Avatar';
import AppContext from '../AppContext';

const EditForm = (props) => {
    // todo: we need to convert the HTML back to an editable state instead of putting it into the textarea
    const [message, setMessage] = useState(props.comment.html);
    const {dispatchAction} = useContext(AppContext);

    const getHTML = () => {
        // Convert newlines to <br> for now (until we add a real editor)
        return message.replace('\n', '<br>');
    };

    const submitForm = async (event) => {
        event.preventDefault();

        await dispatchAction('editComment', {
            id: props.comment.id,
            html: getHTML()
        });

        props.toggle();
        
        return false;
    };

    const handleChange = (event) => {
        setMessage(event.target.value);
    };

    const comment = props.comment;

    return (
        <form onSubmit={submitForm} className="comment-form mb-14">
            <div className="w-full">
                <div className="flex mb-4 space-x-4 justify-start items-center">
                    <Avatar />
                    <div>
                        <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                        <h6 className="text-[13px] text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                    </div>
                </div>
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <textarea className="w-full resize-none rounded-md border h-32 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300" value={message} onChange={handleChange} autoFocus={true} />
                        <div className="flex flex-start">
                            <button type="submit" className="rounded-md border py-2 px-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Edit comment</button>
                            <button className="font-sans text-sm font-medium ml-2.5 text-neutral-500 dark:text-neutral-400" onClick={props.toggle}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default EditForm;
