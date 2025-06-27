import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Button,
    LucideIcon,
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverTrigger,
    buttonVariants
} from '@tryghost/shade';

interface FeedItemMenuProps {
    trigger: React.ReactNode;
    onCopyLink: () => void;
    onDelete: () => void;
    allowDelete: boolean;
    disabled?: boolean;
    layout?: string;
    followedByMe?: boolean;
    authoredByMe?: boolean;
    onFollow?: () => void;
    onUnfollow?: () => void;
}

const FeedItemMenu: React.FC<FeedItemMenuProps> = ({
    trigger,
    onCopyLink,
    onDelete,
    allowDelete = false,
    disabled = false,
    layout,
    followedByMe = false,
    authoredByMe = false,
    onFollow = () => {},
    onUnfollow = () => {}
}) => {
    const handleCopyLinkClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onCopyLink();
    };

    const handleDeleteClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onDelete();
    };

    const handleFollowClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (followedByMe) {
            onUnfollow();
        } else {
            onFollow();
        }
    };

    return (
        <AlertDialog>
            <Popover>
                <PopoverTrigger disabled={disabled} asChild onClick={e => e.stopPropagation()}>
                    {trigger}
                </PopoverTrigger>
                <PopoverContent align={`${layout === 'modal' ? 'start' : 'end'}`} alignOffset={layout === 'modal' ? -12 : 0} className='p-2'>
                    <div className='flex w-48 flex-col'>
                        {(!allowDelete || layout === 'inbox') &&
                            <PopoverClose asChild>
                                <Button className='justify-start' variant='ghost' onClick={handleCopyLinkClick}>
                                    <LucideIcon.Link />
                                    Copy link
                                </Button>
                            </PopoverClose>
                        }
                        {!authoredByMe &&
                            <PopoverClose asChild>
                                <Button className='justify-start' variant='ghost' onClick={handleFollowClick}>
                                    {followedByMe ? <LucideIcon.UserRoundMinus /> : <LucideIcon.UserRoundPlus />}
                                    {followedByMe ? 'Unfollow' : 'Follow'}
                                </Button>
                            </PopoverClose>
                        }
                        {allowDelete &&
                            <AlertDialogTrigger asChild>
                                <PopoverClose asChild>
                                    <Button
                                        className='justify-start text-red hover:bg-red/5 hover:text-red'
                                        variant='ghost'
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <LucideIcon.Trash2 />
                                        Delete
                                    </Button>
                                </PopoverClose>
                            </AlertDialogTrigger>
                        }
                    </div>
                </PopoverContent>
            </Popover>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {layout === 'inbox' ? 'This will remove the post from the Ghost social web, but it will remain on your website.' : <>If you delete this post, you won&apos;t be able to restore it.</>}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={e => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={buttonVariants({variant: 'destructive'})}
                        onClick={handleDeleteClick}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default FeedItemMenu;
