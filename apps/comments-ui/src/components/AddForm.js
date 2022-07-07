import React, {useContext, useState} from 'react';
import {Transition} from '@headlessui/react';
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
        <form onSubmit={submitForm} onClick={handleFocus} className={`comment-form transition duration-200 border border-neutral-150 hover:border-neutral-200 rounded-md px-3 pt-3 pb-2 -ml-[13px] -mr-3 -mt-[15px] mb-10 shadow-lg shadow-neutral-50 hover:shadow-xl hover:shadow-neutral-100 ${focused ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="w-full relative">
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full ">
                        <textarea
                            className={`transition-[height] pl-[56px] px-0 py-[14px] ${focused ? 'mt-8' : 'mt-0'} duration-150 w-full placeholder:text-neutral-300 border-none resize-none rounded-md border border-slate-50 font-sans text-[16.5px] mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300 ${focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-12 hover:border-slate-300'}`}
                            value={message}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            autofocus={true}
                            placeholder='Join the discussion'
                        />
                        <button
                            className={`transition-[opacity] duration-150 absolute -right-[9px] bottom-[2px] rounded-md border py-3 px-4 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`}
                            type="submit">
                            Add comment
                        </button>
                    </div>
                </div>
                <div className="flex mb-1 justify-start items-center absolute top-[2px] left-0">
                    <Avatar saturation={props.avatarSaturation} />
                    <Transition
                        show={focused}
                        enter="transition duration-500 ease-in-out"
                        enterFrom="opacity-0 -translate-x-2"
                        enterTo="opacity-100 translate-x-0"
                        leave="transition-none duration-0"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="ml-3">
                            <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-neutral-300">{member.name ? member.name : 'Anonymous'}</h4>
                        </div>
                    </Transition>
                </div>
            </div>
        </form>
    );
};
  
export default AddForm;
