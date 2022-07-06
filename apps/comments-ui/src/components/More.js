import {ReactComponent as MoreIcon} from '../images/icons/more.svg';
import React from 'react';
import AppContext from '../AppContext';
import CommentContextMenu from './modals/CommentContextMenu';

class More extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            isContextMenuOpen: false
        };

        this.toggleContextMenu = this.toggleContextMenu.bind(this);
    }

    toggleContextMenu() {
        this.setState(state => ({
            isContextMenuOpen: !state.isContextMenuOpen
        }));
    }

    render() {
        const comment = this.props.comment;
        const show = this.props.show;

        return (
            <div className="relative">
                {show ? <button onClick={this.toggleContextMenu}><MoreIcon className='gh-comments-icon gh-comments-icon-more -m-[3px]' /></button> : null}
                {this.state.isContextMenuOpen ? <CommentContextMenu comment={comment} close={this.toggleContextMenu} toggleEdit={this.props.toggleEdit} /> : null}
            </div>
        );
    }
}

export default More;
