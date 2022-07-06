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
                <div className="flex bg-neutral-50 p-3 space-x-3 rounded-md dark:bg-transparent">
                    <Avatar size="small" />
                    <div className="w-full">
                        <textarea className="w-full resize-none rounded-md border h-24 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300" value={this.state.message} onChange={this.handleChange} placeholder="Join the conversation" />
                        <button type="submit" className="w-full rounded-md border p-3 py-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Add your comment</button>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default Form;
