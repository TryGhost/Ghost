import {ReactComponent as AvatarIcon} from '../../images/icons/avatar.svg';
import {Comment, useAppContext} from '../../AppContext';
import {getInitials, getMemberInitialsFromComment} from '../../utils/helpers';

function getDimensionClasses() {
    return 'w-8 h-8';
}

export const BlankAvatar = () => {
    const dimensionClasses = getDimensionClasses();
    return (
        <figure className={`relative ${dimensionClasses}`}>
            <div className={`flex items-center justify-center rounded-full bg-black/10 dark:bg-white/15 ${dimensionClasses}`}>
                <AvatarIcon className="stroke-white opacity-80" />
            </div>
        </figure>
    );
};

type AvatarProps = {
    comment?: Comment;
};
export const Avatar: React.FC<AvatarProps> = ({comment}) => {
    const {member, avatarSaturation, t} = useAppContext();
    const dimensionClasses = getDimensionClasses();

    const memberName = member?.name ?? comment?.member?.name;

    const getHashOfString = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        hash = Math.abs(hash);
        return hash;
    };

    const normalizeHash = (hash: number, min: number, max: number) => {
        return Math.floor((hash % (max - min)) + min);
    };

    const generateHSL = (): [number, number, number] => {
        const commentMember = (comment ? comment.member : member);

        if (!commentMember || !commentMember.name) {
            return [0,0,10];
        }

        const saturation = avatarSaturation === undefined || isNaN(avatarSaturation) ? 50 : avatarSaturation;

        const hRange = [0, 360];
        const lRangeTop = Math.round(saturation / (100 / 30)) + 30;
        const lRangeBottom = lRangeTop - 20;
        const lRange = [lRangeBottom, lRangeTop];

        const hash = getHashOfString(commentMember.name);
        const h = normalizeHash(hash, hRange[0], hRange[1]);
        const l = normalizeHash(hash, lRange[0], lRange[1]);

        return [h, saturation, l];
    };

    const HSLtoString = (hsl: [number, number, number]) => {
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    };

    const memberInitials = (comment && getMemberInitialsFromComment(comment, t)) || 
        (member && getInitials(member.name || '')) || '';
    const commentMember = (comment ? comment.member : member);

    const bgColor = HSLtoString(generateHSL());
    const avatarStyle = {
        background: bgColor
    };

    const avatarEl = (
        <>
            {memberName ?
                (<div className={`flex items-center justify-center rounded-full ${dimensionClasses}`} data-testid="avatar-background" style={avatarStyle}>
                    <p className="font-sans text-base font-semibold text-white">{memberInitials}</p>
                </div>) :
                (<div className={`flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white/70 ${dimensionClasses}`} data-testid="avatar-background">
                    <AvatarIcon className="stroke-white dark:stroke-black/60" />
                </div>)}
            {commentMember && <img alt="Avatar" className={`absolute left-0 top-0 rounded-full ${dimensionClasses}`} src={commentMember.avatar_image}/>}
        </>
    );

    return (
        <figure className={`relative ${dimensionClasses}`}>
            {avatarEl}
        </figure>
    );
};
