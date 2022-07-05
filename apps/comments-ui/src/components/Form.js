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
                <div>
                    <div>
                        <figure>
                            {this.context.member ?
                                <img className="w-10 h-10 rounded-full" src={this.context.member.avatar_image} alt="Avatar"/> :
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black">{ this.getInitials() }</div>
                            }
                        </figure>
                        <div>
                            <h4 className="text-lg font-sans font-semibold mb-1">{this.context.member ? this.context.member.name : ''}</h4>
                        </div>
                    </div>
                    <textarea className="w-full resize-none rounded-md border h-24 p-2 font-sans" value={this.state.message} onChange={this.handleChange} placeholder="What are your thoughts?" />
                    <button type="submit" className="bg-black p-2 text-white rounded w-full mt-2 text-md font-sans">Comment</button>
                </div>
            </form>
        );
    }
}
  
export default Form;
