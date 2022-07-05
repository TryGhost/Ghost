import React from 'react';
import AppContext from '../AppContext';

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
                html: message
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

    getInitials() {
        if (!this.context.member || !this.context.member.name) {
            return '';
        }
        const parts = this.context.member.name.split(' ');

        if (parts.length === 0) {
            return '';
        }

        if (parts.length === 1) {
            return parts[0].substring(0, 1);
        }

        return parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1);
    }

    render() {
        return (
            <form onSubmit={this.submitForm} className="comment-form">         
                <div className="flex bg-neutral-50 p-3 space-x-3 rounded-md dark:bg-transparent">
                    <figure>
                        {this.context.member ?
                            <img className="w-8 h-8 rounded-full" src={this.context.member.avatar_image} alt="Avatar"/> :
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black">{ this.getInitials() }</div>
                        }
                    </figure>
                    <div className="w-full">
                        <textarea className="w-full resize-none rounded-md border h-24 p-3 font-sans mb-1 focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none" value={this.state.message} onChange={this.handleChange} placeholder="Join the conversation" />
                        <button type="submit" className="w-full rounded-md border p-3 py-2.5 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Add your comment</button>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default Form;
