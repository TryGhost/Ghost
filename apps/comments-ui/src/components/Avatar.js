import React from 'react';
import AppContext from '../AppContext';
import {getInitials} from '../utils/helpers';

class Avatar extends React.Component {
    static contextType = AppContext;

    getInitials() {
        let commentMember = (this.props.comment ? this.props.comment.member : this.context.member);

        if (!commentMember || !commentMember.name) {
            return '';
        }
        return getInitials(commentMember.name);
    }

    render() {
        let dimensionClasses = (this.props.size === 'small' ? 'w-8 h-8' : 'w-10 h-10');
        let initialsClasses = (this.props.size === 'small' ? 'text-sm' : 'text-base');
        let commentMember = (this.props.comment ? this.props.comment.member : this.context.member);

        return (
            <figure className={`relative ${dimensionClasses}`}>
                <div className={`flex justify-center items-center rounded-full bg-black ${dimensionClasses}`}>
                    <p className={`text-white font-sans font-semibold ${initialsClasses}`}>{ this.getInitials() }</p>
                </div>
                <img className={`absolute top-0 left-0 rounded-full ${dimensionClasses}`} src={commentMember.avatar_image} alt="Avatar"/>
            </figure>
        );
    }
}

export default Avatar;
