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
        if (!this.context.member) {
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
                <div>
                    <figure>
                        <div>
                            { this.getInitials() }
                        </div>
                        { this.context.member ? <img src={this.context.member.avatar_image} width="60" height="60" alt="Avatar"/> : '' }
                    </figure>
                    <div>
                        <div>
                            {this.context.member ? this.context.member.name : ''}
                        </div>
                        <span>
                            Add a bio
                        </span>
                    </div>
                   
                </div>

                <textarea className="w-full rounded-md border p-2" value={this.state.message} onChange={this.handleChange} placeholder="What are your thoughts?" />
                <button type="submit" className="bg-black p-2 text-white rounded w-full mt-2">Comment</button>
            </form>
        );
    }
}
  
export default Form;
