import React from 'react';
import AppContext from '../AppContext';
import {ReactComponent as LikeIcon} from '../images/icons/like.svg';

class Like extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            liked: false
        };

        this.toggleLike = this.toggleLike.bind(this);
    }

    toggleLike() {
        this.setState(state => ({
            liked: !state.liked
        }));
    }

    render() {
        return (
            <button className="flex font-sans text-[14px] items-center" onClick={this.toggleLike}><LikeIcon className={`gh-comments-icon gh-comments-icon-like mr-1 ${this.state.liked ? 'fill-black' : ''}`} />3</button>
        );
    }
}

export default Like;
