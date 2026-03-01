import {LucideIcon, cn} from '@tryghost/shade';

interface MemberAvatarProps {
    avatarImage?: string | null;
    memberId?: string | null;
    isHidden?: boolean;
    className?: string;
}

export function MemberAvatar({avatarImage, memberId, isHidden, className}: MemberAvatarProps) {
    return (
        <div className={cn(
            'relative flex size-6 min-w-6 items-center justify-center overflow-hidden rounded-full bg-accent md:size-8 md:min-w-8',
            isHidden && 'opacity-50',
            className
        )}>
            {memberId && avatarImage && (
                <div className='absolute inset-0'>
                    <img alt="Member avatar" src={avatarImage} />
                </div>
            )}
            <div>
                <LucideIcon.User className='!size-3 text-muted-foreground md:!size-4' size={12} />
            </div>
        </div>
    );
}
