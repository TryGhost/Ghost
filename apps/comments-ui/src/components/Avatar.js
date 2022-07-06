import React from 'react';
import AppContext from '../AppContext';
import {getInitials} from '../utils/helpers';

class Avatar extends React.Component {
    static contextType = AppContext;

    getInitials() {
        if (!this.context.member || !this.context.member.name) {
            return '';
        }
        return getInitials(this.context.member.name);
    }

    render() {
        let dimensionClasses = (this.props.size === 'small' ? 'w-8 h-8' : 'w-10 h-10');
        let initialsClasses = (this.props.size === 'small' ? 'text-sm' : 'text-base');

        return (
            <figure className={`relative ${dimensionClasses}`}>
                <div className={`flex justify-center items-center rounded-full bg-black ${dimensionClasses}`}>
                    <p className={`text-white font-sans font-semibold ${initialsClasses}`}>{ this.getInitials() }</p>
                </div>
                <img className={`absolute top-0 left-0 rounded-full ${dimensionClasses}`} src={this.context.member.avatar_image} alt="Avatar"/>
            </figure>
        );
    }
}

export default Avatar;
