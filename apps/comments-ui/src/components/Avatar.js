import React from 'react';
import AppContext from '../AppContext';
import {getInitials} from '../utils/helpers';

class Avatar extends React.Component {
    static contextType = AppContext;
    
    getHashOfString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        hash = Math.abs(hash);
        return hash;
    }

    normalizeHash(hash, min, max) {
        return Math.floor((hash % (max - min)) + min);
    }

    generateHSL() {
        let commentMember = (this.props.comment ? this.props.comment.member : this.context.member);

        if (!commentMember || !commentMember.name) {
            return [0,0,10];
        }

        const saturation = isNaN(this.props.saturation) ? 50 : this.props.saturation;

        const hRange = [0, 360];
        const lRangeTop = Math.round(saturation / (100 / 30)) + 30;
        const lRangeBottom = lRangeTop - 20;
        const lRange = [lRangeBottom, lRangeTop];

        const hash = this.getHashOfString(commentMember.name);
        const h = this.normalizeHash(hash, hRange[0], hRange[1]);
        const l = this.normalizeHash(hash, lRange[0], lRange[1]);
        
        return [h, saturation, l];
    }

    HSLtoString(hsl) {
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    }

    getInitials() {
        let commentMember = (this.props.comment ? this.props.comment.member : this.context.member);

        if (!commentMember || !commentMember.name) {
            return getInitials('Anonymous');
        }
        return getInitials(commentMember.name);
    }

    render() {
        let dimensionClasses = (this.props.size === 'small' ? 'w-8 h-8' : 'w-12 h-12');
        let initialsClasses = (this.props.size === 'small' ? 'text-sm' : 'text-base');
        let commentMember = (this.props.comment ? this.props.comment.member : this.context.member);

        const bgColor = this.HSLtoString(this.generateHSL());
        const avatarStyle = {
            background: bgColor
        };

        return (
            <figure className={`relative ${dimensionClasses}`}>
                <div className={`flex justify-center items-center rounded-full ${dimensionClasses}`} style={avatarStyle}>
                    <p className={`text-white font-sans font-semibold ${initialsClasses}`}>{ this.getInitials() }</p>
                </div>
                <img className={`absolute top-0 left-0 rounded-full ${dimensionClasses}`} src={commentMember.avatar_image} alt="Avatar"/>
            </figure>
        );
    }
}

export default Avatar;
