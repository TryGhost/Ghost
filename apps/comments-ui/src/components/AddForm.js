// import React, {useState} from 'react';
import React from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

// const Form = (props) => {
//     const [message, setMessage] = useState('');

//     const getHTML = () => {
//         // Convert newlines to <br> for now (until we add a real editor)
//         return message.replace('\n', '<br>');
//     };

//     const submitForm = async (event) => {
//         event.preventDefault();

//         if (message.length === 0) {
//             alert('Please enter a message');
//             return;
//         }

//         try {
//             // Todo: send comment to server
//             await this.context.onAction('addComment', {
//                 post_id: this.context.postId,
//                 status: 'published',
//                 html: getHTML()
//             });

//             // Clear message on success
//             setMessage('');
//         } catch (e) {
//             // eslint-disable-next-line no-console
//             console.error(e);
//         }
//     };

//     const handleChange = (event) => {
//         setMessage(event.target.value);
//     };

//     return (
//         <form onSubmit={submitForm} className="comment-form">
//             <div className="w-full">
//                 <div className="flex mb-2 space-x-4 justify-start items-center">
//                     <Avatar />
//                     <div>
//                         <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{this.context.member.name}</h4>
//                         <h6 className="text-xs text-neutral-400 font-sans">&nbsp;</h6>
//                     </div>
//                 </div>
//                 <div className="-mt-4 ml-14 pr-3 font-sans leading-normal dark:text-neutral-300">
//                     <div className="relative w-full">
//                         <textarea className="w-full resize-none rounded-md border h-36 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300" value={message} onChange={handleChange} />
//                         <div className="absolute bottom-5 right-3">
//                             <button type="submit" className="w-full rounded-md border p-3 py-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Add your comment</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </form>
//     );
// };

class AddForm extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            message: '',
            focused: false
        };

        this.submitForm = this.submitForm.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
    }

    getHTML() {
        const text = this.state.message;

        // Convert newlines to <br> for now (until we add a real editor)
        return text.replace('\n', '<br>');
    }

    async submitForm(event) {
        event.preventDefault();
        const message = this.state.message;

        if (message.length === 0) {
            // alert('Please enter a message'); TODO: Check, but don't think we really need this
            return;
        }

        try {
            // Todo: send comment to server
            await this.context.onAction('addComment', {
                post_id: this.context.postId,
                status: 'published',
                html: this.getHTML()
            });

            // Clear message on success
            this.setState({
                message: '',
                focused: false
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    }

    handleChange(event) {
        this.setState({message: event.target.value});
    }

    handleBlur(event) {
        // this.setState({focused: false});
    }

    handleFocus(event) {
        this.setState({focused: true});
    }

    render() {
        return (
            <form onSubmit={this.submitForm} className="comment-form">
                <div className="w-full">
                    <div className="flex mb-2 space-x-4 justify-start items-center">
                        <Avatar />
                    </div>
                    <div className="-mt-[51px] ml-14 pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <textarea className={`transition-[height] ${this.state.focused ? 'cursor-text h-40' : 'cursor-pointer hover:border-slate-300 h-12 '} duration-150 w-full resize-none rounded-md border border-slate-200 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300`} value={this.state.message} onChange={this.handleChange} onFocus={this.handleFocus} onBlur={this.handleBlur} placeholder={this.state.focused ? '' : 'Add to the discussion'} />
                            <button className={`transition-[opacity] ${this.state.focused ? 'opacity-100' : 'opacity-0'} duration-150 rounded-md border p-3 py-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`} type="submit">Add your comment</button>
                            <button className={`transition-[opacity] ${this.state.focused ? 'opacity-0' : 'opacity-100'} duration-100 absolute top-[5px] right-[5px] rounded-md border p-2 font-sans text-sm text-center bg-black font-semibold text-white pointer-events-none dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800`} disabled="true">Comment</button>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default AddForm;
