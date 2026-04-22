import {LucideIcon, cn, stringToHslColor} from '@tryghost/shade/utils';
import {formatMemberName, getMemberInitials} from '@tryghost/shade/app';

interface MemberAvatarProps {
    avatarImage?: string | null;
    memberId?: string | null;
    memberName?: string | null;
    memberEmail?: string | null;
    isHidden?: boolean;
    className?: string;
}

export function MemberAvatar({avatarImage, memberId, memberName, memberEmail, isHidden, className}: MemberAvatarProps) {
    const member = {name: memberName || undefined, email: memberEmail || undefined};
    const hasIdentity = !!(memberName || memberEmail);
    const initials = hasIdentity ? getMemberInitials(member) : null;
    const bgColor = hasIdentity ? stringToHslColor(formatMemberName(member), '75', '55') : undefined;

    return (
        <div
            className={cn(
                'relative flex size-6 min-w-6 items-center justify-center overflow-hidden rounded-full md:size-8 md:min-w-8',
                !hasIdentity && 'bg-accent',
                isHidden && 'opacity-50',
                className
            )}
            style={hasIdentity ? {backgroundColor: bgColor} : undefined}
        >
            {initials ? (
                <span className='text-xs font-semibold text-white md:text-sm'>{initials}</span>
            ) : (
                <LucideIcon.User className='size-3! text-muted-foreground md:size-4!' size={12} />
            )}
            {memberId && avatarImage && (
                <div className='absolute inset-0'>
                    <img alt="Member avatar" src={avatarImage} />
                </div>
            )}
        </div>
    );
}
