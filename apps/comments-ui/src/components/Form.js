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

    render() {
        return (
            <form onSubmit={this.submitForm} className="comment-form">
                <figure className="avatar">
                    <span />
                </figure>
                <textarea value={this.state.message} onChange={this.handleChange} placeholder="What are your thoughts?" />
                <button type="submit" className="button primary">Comment</button>
            </form>
        );
    }
}
  
export default Form;
