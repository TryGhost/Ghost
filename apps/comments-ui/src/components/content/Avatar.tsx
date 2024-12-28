import {ReactComponent as AvatarIcon} from '../../images/icons/avatar.svg';
import {Comment, Member, useAppContext} from '../../AppContext';
import {getInitials, getMemberInitialsFromComment} from '../../utils/helpers';

function getDimensionClasses() {
    return 'w-8 h-8';
}

export const BlankAvatar = () => {
    const dimensionClasses = getDimensionClasses();
    return (
        <figure className={`relative ${dimensionClasses}`}>
            <div className={`flex items-center justify-center rounded-full bg-black/5 text-neutral-900/25 dark:bg-white/15 dark:text-white/30 ${dimensionClasses}`}>
                <AvatarIcon className="h-7 w-7 opacity-80" />
            </div>
        </figure>
    );
};

type AvatarProps = {
    comment?: Comment;
    member?: Member;
};

export const Avatar: React.FC<AvatarProps> = ({comment, member: propMember}) => {
    const {member: contextMember, avatarSaturation, t} = useAppContext();
    const dimensionClasses = getDimensionClasses();

    const activeMember = propMember || comment?.member || contextMember;
    const memberName = activeMember?.name;

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
        if (!activeMember || !activeMember.name) {
            return [0,0,10];
        }

        const saturation = avatarSaturation === undefined || isNaN(avatarSaturation) ? 50 : avatarSaturation;

        const hRange = [0, 360];
        const lRangeTop = Math.round(saturation / (100 / 30)) + 30;
        const lRangeBottom = lRangeTop - 20;
        const lRange = [lRangeBottom, lRangeTop];

        const hash = getHashOfString(activeMember.name);
        const h = normalizeHash(hash, hRange[0], hRange[1]);
        const l = normalizeHash(hash, lRange[0], lRange[1]);

        return [h, saturation, l];
    };

    const HSLtoString = (hsl: [number, number, number]) => {
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    };

    const memberInitials = (comment && getMemberInitialsFromComment(comment, t)) ||
        (activeMember && getInitials(activeMember.name || '')) || '';

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
            {activeMember?.avatar_image && <img alt="Avatar" className={`absolute left-0 top-0 rounded-full ${dimensionClasses}`} data-testid="avatar-image" src={activeMember.avatar_image} />}
        </>
    );

    return (
        <figure className={`relative ${dimensionClasses}`} data-testid="avatar">
            {avatarEl}
        </figure>
    );
};
