// Contains breadcrumb, page title, global buttons and tab bar
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Heading, Icon} from '@tryghost/shade';

const Header = () => {
    return (
        <header>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/posts/">Posts</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbPage>
                    Analytics
                    </BreadcrumbPage>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-2 flex items-start justify-between">
                <Heading size="pagetitle">The billionaires hedge their bets</Heading>
                <div className="mt-1 flex items-center gap-2">
                    <Button variant='outline'><Icon name="share" /> Share</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="outline"><Icon name="ellipsis" /></Button>
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
        </header>
    );
};

export default Header;