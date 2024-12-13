import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, H1, Icon} from '@tryghost/shade';

const Header = () => {
    return (
        <div className="pt-9">
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
            <div className="mt-1 flex items-start justify-between gap-5">
                <H1 className='grow'>The Evolution of Basketball: From Pastime to Professional Sport</H1>
                <div className='flex items-center gap-1'>
                    <Button variant='outline'><Icon.Share className='-mt-0.5' />Share</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant='outline'><Icon.Dotdotdot /></Button>
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
        </div>
    );
};

export default Header;