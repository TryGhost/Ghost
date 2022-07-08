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
            comment: {
                id: props.comment.id,
                html: getHTML()
            },
            parent: props.parent
        });

        props.toggle();
        
        return false;
    };

    const handleChange = (event) => {
        setMessage(event.target.value);
    };

    const comment = props.comment;

    return (
        <form onSubmit={submitForm} className={`comment-form transition duration-200 bg-white dark:bg-[rgba(255,255,255,0.08)] rounded-md px-3 pt-3 pb-2 -ml-[13px] -mr-3 -mt-[13px] mb-10 shadow-lg dark:shadow-transparent hover:shadow-xl`}>
            <div>
                <div className="flex justify-start items-center">
                    <Avatar saturation={props.avatarSaturation} />
                    <div className="ml-3">
                        <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name ? comment.member.name : 'Anonymous'}</h4>
                    </div>
                </div>
                <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                    <div className="relative w-full">
                        <textarea
                            className={`w-full h-40 pl-[56px] border-none resize-none p-0 font-sans text-[16.5px] mb-1 leading-normal placeholder:text-neutral-300 focus:outline-0 bg-transparent dark:placeholder:text-[rgba(255,255,255,0.3)] dark:border-none dark:text-[rgba(255,255,255,0.9)] dark:shadow-transparent`}
                            value={message}
                            onChange={handleChange}
                            onFocus={function (e) {
                                var val = e.target.value;
                                e.target.value = '';
                                e.target.value = val;
                            }}
                            autoFocus
                            placeholder='Join the discussion'
                        />
                        <div className="flex space-x-4 transition-[opacity] duration-150 absolute -right-3 bottom-2">
                            <button type="button" className="font-sans text-sm font-medium ml-2.5 text-neutral-500 dark:text-neutral-400" onClick={props.toggle}>Cancel</button>
                            <button
                                className={`rounded-md border py-3 px-4 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.9)] dark:text-neutral-800`}
                                type="submit">
                                Edit comment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default EditForm;
