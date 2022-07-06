import React from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

class Form extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            message: ''
        };

        this.submitForm = this.submitForm.bind(this);
        this.handleChange = this.handleChange.bind(this);
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
            alert('Please enter a message');
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
            this.setState({message: ''});
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    }

    handleChange(event) {
        this.setState({message: event.target.value});
    }

    render() {
        return (
            <form onSubmit={this.submitForm} className="comment-form">
                <div className="w-full">
                    <div className="flex mb-2 space-x-4 justify-start items-center">
                        <Avatar />
                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{this.context.member.name}</h4>
                            <h6 className="text-xs text-neutral-400 font-sans">&nbsp;</h6>
                        </div>
                    </div>
                    <div className="-mt-4 ml-14 pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <textarea className="w-full resize-none rounded-md border h-36 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300" value={this.state.message} onChange={this.handleChange} />
                            <div className="absolute bottom-5 right-3">
                                <button type="submit" className="w-full rounded-md border p-3 py-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Add your comment</button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default Form;
