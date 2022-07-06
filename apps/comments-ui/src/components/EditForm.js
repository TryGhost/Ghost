import {formatRelativeTime} from '../utils/helpers';
import React from 'react';
import AppContext from '../AppContext';
import Avatar from './Avatar';

class EditForm extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            message: props.value.__html
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
        
        return false;
    }

    handleChange(event) {
        this.setState({message: event.target.value});
    }

    render() {
        const comment = this.props.comment;

        return (
            <form onSubmit={this.submitForm} className="comment-form mb-6">
                <div className="w-full">
                    <div className="flex mb-2 space-x-4 justify-start items-center">
                        <Avatar />
                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                            <h6 className="text-xs text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                        </div>
                    </div>
                    <div className="ml-14 pr-3 font-sans leading-normal dark:text-neutral-300">
                        <div className="relative w-full">
                            <textarea className="w-full resize-none rounded-md border h-32 p-3 font-sans mb-1 leading-normal focus:outline-0 dark:bg-[rgba(255,255,255,0.08)] dark:border-none dark:text-neutral-300" value={this.state.message} onChange={this.handleChange} />
                            <div className="flex flex-start">
                                <button type="submit" className="rounded-md border p-2 font-sans text-sm text-center bg-black font-semibold text-white dark:bg-[rgba(255,255,255,0.8)] dark:text-neutral-800">Edit comment</button>
                                <button className="font-sans text-sm font-medium ml-2.5 text-neutral-500" onClick={this.props.toggle}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}
  
export default EditForm;
