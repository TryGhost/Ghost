import ShareModal from '../views/post-analytics/modals/ShareModal';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, H1, LucideIcon} from '@tryghost/shade';
import {useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';

interface headerProps {};

const Header: React.FC<headerProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {postId} = useParams();

    // Handling the share dialog via navigation
    const isShareDialogOpen = location.pathname === `/analytics/${postId}/share`;
    const openShareDialog = () => {
        navigate(`/analytics/${postId}/share`);
    };
    const closeShareDialog = () => {
        navigate(`/analytics/${postId}`);
    };

    return (
        <div className="flex flex-col items-start justify-between gap-1 pt-9">
            <div className='flex h-8 w-full items-center justify-between gap-3'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink className='cursor-pointer' onClick={() => navigate('/')}>
                                Posts
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>
                                Analytics
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className='flex items-center gap-2'>
                    <Button variant='outline' onClick={openShareDialog}><LucideIcon.Share />Share</Button>
                    <Dialog open={isShareDialogOpen} onOpenChange={closeShareDialog}>
                        <ShareModal />
                    </Dialog>
                    <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button variant='outline'><LucideIcon.Ellipsis /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                                <DropdownMenuItem>
                                    <span>Edit post</span>
                                    <DropdownMenuShortcut>⇧⌘E</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>View in browser</span>
                                    <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DialogTrigger className="w-full">
                                    <DropdownMenuItem className="text-red">
                                        Delete
                                    </DropdownMenuItem>
                                </DialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you sure you want to delete this post?</DialogTitle>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <H1 className='mt-2 max-w-[960px]'>The Evolution of Basketball: From Pastime to Professional and One of the Most Popular Sports</H1>
        </div>
    );
};

export default Header;
