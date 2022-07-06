import React from 'react';
import AppContext from '../../AppContext';

class AdminContextMenu extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {};

        this.hideComment = this.hideComment.bind(this);
        this.showComment = this.showComment.bind(this);
    }

    hideComment(event) {
        this.context.onAction('hideComment', this.props.comment);
        this.close();
    }

    showComment(event) {
        this.context.onAction('showComment', this.props.comment);
        this.close();
    }

    get isHidden() {
        return this.props.comment.status !== 'published';
    }

    close() {
        this.props.close();
    }

    render() {
        return (
            <div className="flex flex-col">
                {
                    this.isHidden ? 
                        <button className="text-[14px]" onClick={this.showComment}>
                            Show comment
                        </button> 
                        : 
                        <button className="text-[14px]" onClick={this.hideComment}>
                            Hide comment
                        </button>
                }
            </div>
        );
    }
}
  
export default AdminContextMenu;
