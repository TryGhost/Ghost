// import React, {useState} from 'react';
import React, {useContext, useState} from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

const AddForm = (props) => {
    const [message, setMessage] = useState('');
    const [focused, setFocused] = useState(false);
    const {member, postId, onAction} = useContext(AppContext);

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
            await onAction('addComment', {
                post_id: postId,
                status: 'published',
                html: getHTML()
            });

            // Clear message on success
            setMessage('');
            setFocused(false);
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
            setFocused(false);
        }
    };

    const handleFocus = (event) => {
        setFocused(true);
    };

    return (
        <form onSubmit={submitForm} className="comment-form">
            <div className="w-full">
                <div className="flex mb-4 space-x-4 justify-start items-center">
                    <Avatar />
                    <div>
                        <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{member.name}</h4>
                        <h6 className="text-[13px] text-neutral-400 font-sans">Now</h6>
                    </div>
                </div>
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <textarea
                            className={`transition-[height] duration-150 w-full resize-none rounded-md border border-slate-200 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300 ${focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-12 hover:border-slate-300'}`}
                            value={message}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={focused ? '' : 'Add to the discussion'}
                        />
                        <button
                            className={`transition-[opacity] duration-150 rounded-md border py-2 px-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800 ${focused ? 'opacity-100' : 'opacity-0'}`}
                            type="submit">
                            Add your comment
                        </button>
                        <button
                            className={`transition-[opacity] duration-100 absolute top-2 right-2 rounded-md border py-1 px-2 font-sans text-sm text-center bg-black font-semibold text-white pointer-events-none dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800 ${focused ? 'opacity-0' : 'opacity-100'}`}
                            disabled={true}>
                            Comment
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};
  
export default AddForm;
