import React, {useContext} from 'react';
import AppContext from '../AppContext';
import {getInitials} from '../utils/helpers';
import {ReactComponent as AvatarIcon} from '../images/icons/avatar.svg';

const Avatar = (props) => {
    const {member} = useContext(AppContext);

    const getHashOfString = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        hash = Math.abs(hash);
        return hash;
    };

    const normalizeHash = (hash, min, max) => {
        return Math.floor((hash % (max - min)) + min);
    };

    const generateHSL = () => {
        let commentMember = (props.comment ? props.comment.member : member);

        if (!commentMember || !commentMember.name) {
            return [0,0,10];
        }

        const saturation = isNaN(props.saturation) ? 50 : props.saturation;

        const hRange = [0, 360];
        const lRangeTop = Math.round(saturation / (100 / 30)) + 30;
        const lRangeBottom = lRangeTop - 20;
        const lRange = [lRangeBottom, lRangeTop];

        const hash = getHashOfString(commentMember.name);
        const h = normalizeHash(hash, hRange[0], hRange[1]);
        const l = normalizeHash(hash, lRange[0], lRange[1]);
        
        return [h, saturation, l];
    };

    const HSLtoString = (hsl) => {
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    };

    const commentGetInitials = () => {
        if (props.comment && !props.comment.member) {
            return getInitials('Deleted member');
        }
        
        let commentMember = (props.comment ? props.comment.member : member);

        if (!commentMember || !commentMember.name) {
            return getInitials('Anonymous');
        }
        return getInitials(commentMember.name);
    };

    let dimensionClasses = (props.size === 'small' ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-[40px] sm:h-[40px]');
    let initialsClasses = (props.size === 'small' ? 'text-sm' : 'text-lg');
    let commentMember = (props.comment ? props.comment.member : member);

    const bgColor = HSLtoString(generateHSL());
    const avatarStyle = {
        background: bgColor
    };

    let avatarEl = (
        <>
            <div className={`flex justify-center items-center rounded-full ${dimensionClasses}`} style={avatarStyle}>
                <p className={`text-white font-sans font-semibold ${initialsClasses}`}>{ commentGetInitials() }</p>
            </div>
            {commentMember && <img className={`absolute top-0 left-0 rounded-full ${dimensionClasses}`} src={commentMember.avatar_image} alt="Avatar"/>}
        </>
    );

    // When an avatar has been deleted or hidden
    if (props.isBlank) {
        avatarEl = (
            <div className={`flex justify-center items-center rounded-full bg-neutral-300 dark:opacity-70 ${dimensionClasses}`}>
                <AvatarIcon className="stroke-white dark:stroke-neutral-600" />
            </div>
        );
    // When an avatar has no name
    } else if (props.isAnonymous) {
        avatarEl = (
            <div className={`flex justify-center items-center rounded-full bg-neutral-900 dark:bg-[rgba(255,255,255,0.7)] ${dimensionClasses}`}>
                <AvatarIcon className="stroke-white dark:stroke-[rgba(0,0,0,0.6)]" />
            </div>
        );
    }

    return (
        <figure className={`relative ${dimensionClasses}`}>
            {avatarEl}
        </figure>
    );
};

export default Avatar;
