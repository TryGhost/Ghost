import React, {useState, useContext} from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

const ReplyForm = (props) => {
    const [message, setMessage] = useState('');
    const [focused, setFocused] = useState(false);
    const {postId, dispatchAction} = useContext(AppContext);

    const getHTML = () => {
        // Convert newlines to <br> for now (until we add a real editor)
        return message.replace('\n', '<br>');
    };

    const submitForm = async (event) => {
        event.preventDefault();

        if (message.length === 0) {
            // alert('Please enter a message'); TODO: Check, but don't think we really need this
            return;
        }

        try {
            // Send comment to server
            await dispatchAction('addReply', {
                parent: props.parent,
                reply: {
                    post_id: postId,
                    status: 'published',
                    html: getHTML()
                }
            });

            // Clear message on success
            setMessage('');
            setFocused(false);
            props.toggle();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    };

    const handleChange = (event) => {
        setMessage(event.target.value);
    };

    const handleBlur = (event) => {
        if (message === '') {
            props.toggle();
        }
    };

    const handleFocus = (event) => {
        setFocused(true);
    };

    return (
        <form onSubmit={submitForm} onClick={handleFocus} className={`comment-form transition duration-200 border border-neutral-150 hover:border-neutral-200 rounded-md px-3 pt-3 pb-2 -ml-[13px] -mr-[12px] -mt-[15px] shadow-lg shadow-neutral-50 hover:shadow-xl hover:shadow-neutral-100 ${focused ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="w-full relative">
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <textarea
                            className={`transition-[height] pl-[56px] mt-0 duration-150 w-full placeholder:text-neutral-300 text-[16.5px] border-none resize-none rounded-md border border-slate-50 px-0 py-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300 ${focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-12 hover:border-slate-300'}`}
                            value={message}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            autofocus={true}
                            placeholder='Reply to comment'
                        />
                        <button
                            className={`transition-[opacity] duration-150 absolute -right-3 bottom-2 rounded-md border py-3 px-4 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`}
                            type="submit">
                            Add reply
                        </button>
                    </div>
                </div>
                <div className="flex mb-1 justify-start items-center absolute top-[2px] left-0">
                    <Avatar saturation={props.avatarSaturation} />
                </div>
            </div>
        </form>
    );
};
  
export default ReplyForm;
