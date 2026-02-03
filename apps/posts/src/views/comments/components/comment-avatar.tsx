import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    LucideIcon,
    cn
} from '@tryghost/shade';

interface CommentAvatarProps {
    avatarImage?: string | null;
    memberId?: string | null;
    isHidden?: boolean;
    className?: string;
}

export function CommentAvatar({avatarImage, memberId, isHidden, className}: CommentAvatarProps) {
    const showImage = memberId && avatarImage && !avatarImage.includes('d=blank');

    return (
        <Avatar className={cn(
            'size-6 min-w-6 md:size-8 md:min-w-8',
            isHidden && 'opacity-50',
            className
        )}>
            {showImage && (
                <AvatarImage
                    alt="Member avatar"
                    src={avatarImage}
                    onError={(event) => {
                        (event.target as HTMLImageElement).src = '';
                        (event.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            )}
            <AvatarFallback className='bg-accent'>
                <LucideIcon.User className='!size-3 text-muted-foreground md:!size-4' size={12} />
            </AvatarFallback>
        </Avatar>
    );
}
