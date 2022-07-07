import React from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

class ReplyForm extends React.Component {
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

        // TODO: Add logic to make this work

        // Clear message on success
        this.setState({
            message: '',
            focused: false
        });
    }

    handleChange(event) {
        this.setState({message: event.target.value});
    }

    handleBlur(event) {
        if (this.state.message === '') {
            this.setState({focused: false});
        }
    }

    handleFocus(event) {
        this.setState({focused: true});
    }

    render() {
        return (
            <form onSubmit={this.submitForm} className="comment-form">
                <div className="w-full">
                    <div className="flex mb-4 space-x-4 justify-start items-center">
                        <Avatar />
                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{this.context.member.name}</h4>
                            <h6 className="text-[13px] text-neutral-400 font-sans">Now</h6>
                        </div>
                    </div>
                    <div className="pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <textarea
                                className={`transition-[height] duration-150 w-full resize-none rounded-md border border-slate-200 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300 ${this.state.focused ? 'cursor-text h-40' : 'cursor-pointer overflow-hidden h-12 hover:border-slate-300'}`}
                                value={this.state.message}
                                onChange={this.handleChange}
                                onFocus={this.handleFocus}
                                onBlur={this.handleBlur}
                                placeholder={this.state.focused ? '' : 'Reply to this comment'}
                            />
                            <button
                                className={`transition-[opacity] duration-150 rounded-md border py-2 px-3 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800 ${this.state.focused ? 'opacity-100' : 'opacity-0'}`}
                                type="submit">
                                Add your reply
                            </button>
                            <button
                                className={`transition-[opacity] duration-100 absolute top-2 right-2 rounded-md border py-1 px-2 font-sans text-sm text-center bg-black font-semibold text-white pointer-events-none dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800 ${this.state.focused ? 'opacity-0' : 'opacity-100'}`}
                                disabled="true">
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default ReplyForm;
