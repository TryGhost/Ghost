import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, H1, Icon} from '@tryghost/shade';

const Header = () => {
    return (
        <div className="flex items-end justify-between pt-9">
            <div className="flex flex-col gap-1">
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
                <H1>Post analytics</H1>
            </div>
            <div className='flex items-center gap-1'>
                <Button variant='outline'><Icon.Share className='-mt-0.5' />Share</Button>
                <Button variant='outline'><Icon.Dotdotdot /></Button>
            </div>
        </div>
    );
};

export default Header;