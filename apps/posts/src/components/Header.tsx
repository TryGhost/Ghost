import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, H1, LucideIcon} from '@tryghost/shade';

interface headerProps {};

const Header: React.FC<headerProps> = () => {
    return (
        <div className="flex flex-col items-start justify-between gap-1 pt-9">
            <div className='flex h-8 w-full items-center justify-between gap-3'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/ghost/posts">
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
                    <Button variant='outline'><LucideIcon.Share />Share</Button>
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
                            <DropdownMenuItem className="text-red">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <H1 className='mt-2 max-w-[960px]'>The Evolution of Basketball: From Pastime to Professional and One of the Most Popular Sports</H1>
        </div>
    );
};

export default Header;
