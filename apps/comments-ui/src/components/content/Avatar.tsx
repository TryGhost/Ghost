import {ReactComponent as AvatarIcon} from '../../images/icons/avatar.svg';
import {Member, useAppContext} from '../../AppContext';
import {getInitials, getMemberName} from '../../utils/helpers';

function getDimensionClasses() {
    return 'w-8 h-8';
}

export const BlankAvatar = () => {
    const dimensionClasses = getDimensionClasses();
    return (
        <figure className={`relative ${dimensionClasses}`} data-testid="blank-avatar">
            <div className={`flex items-center justify-center rounded-full bg-black/5 text-neutral-900/25 dark:bg-white/15 dark:text-white/30 ${dimensionClasses}`}>
                <AvatarIcon className="h-7 w-7 opacity-80" />
            </div>
        </figure>
    );
};

type AvatarProps = {
    member: Member | null;
};

export const Avatar: React.FC<AvatarProps> = ({member}) => {
    const {avatarSaturation, t} = useAppContext();
    const dimensionClasses = getDimensionClasses();
    const memberName = getMemberName(member, t);

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
        if (!memberName) {
            return [0,0,10];
        }

        const saturation = avatarSaturation === undefined || isNaN(avatarSaturation) ? 50 : avatarSaturation;

        const hRange = [0, 360];
        const lRangeTop = Math.round(saturation / (100 / 30)) + 30;
        const lRangeBottom = lRangeTop - 20;
        const lRange = [lRangeBottom, lRangeTop];

        const hash = getHashOfString(memberName);
        const h = normalizeHash(hash, hRange[0], hRange[1]);
        const l = normalizeHash(hash, lRange[0], lRange[1]);

        return [h, saturation, l];
    };

    const HSLtoString = (hsl: [number, number, number]) => {
        return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    };

    const memberInitials = (getInitials(memberName));

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
            {member?.avatar_image && <img alt="Avatar" className={`absolute left-0 top-0 rounded-full ${dimensionClasses}`} data-testid="avatar-image" src={member.avatar_image} />}
        </>
    );

    // if member is null, render blank avatar
    if (!member) {
        return <BlankAvatar />;
    }

    return (
        <figure className={`relative ${dimensionClasses}`} data-testid="avatar">
            {avatarEl}
        </figure>
    );
};
