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

        return (
            <div className="relative">
                <button onClick={this.toggleContextMenu}><MoreIcon className='gh-comments-icon gh-comments-icon-more -m-[3px]' /></button>
                {this.state.isContextMenuOpen ? <CommentContextMenu comment={comment} /> : null}
            </div>
        );
    }
}
  
export default More;
