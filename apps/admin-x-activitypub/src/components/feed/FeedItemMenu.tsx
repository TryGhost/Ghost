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
}

const FeedItemMenu: React.FC<FeedItemMenuProps> = ({
    trigger,
    onCopyLink,
    onDelete
}) => {
    const handleCopyLinkClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onCopyLink();
    };

    const handleDeleteClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onDelete();
    };

    return (
        <AlertDialog>
            <Popover>
                <PopoverTrigger asChild onClick={e => e.stopPropagation()}>
                    {trigger}
                </PopoverTrigger>
                <PopoverContent align='end' className='p-2'>
                    <div className='flex w-48 flex-col'>
                        <PopoverClose asChild>
                            <Button className='justify-start' variant='ghost' onClick={handleCopyLinkClick}>
                                Copy link
                            </Button>
                        </PopoverClose>
                        <AlertDialogTrigger asChild>
                            <PopoverClose asChild>
                                <Button
                                    className='justify-start text-red hover:bg-red/5 hover:text-red'
                                    variant='ghost'
                                    onClick={e => e.stopPropagation()}
                                >
                                    Delete
                                </Button>
                            </PopoverClose>
                        </AlertDialogTrigger>
                    </div>
                </PopoverContent>
            </Popover>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You&apos;re about to delete this post. This is permanent! We warned you, k?
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
