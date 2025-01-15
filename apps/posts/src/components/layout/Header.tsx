import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, H1} from '@tryghost/shade';

const Header = () => {
    return (
        <div className='pt-8'>
            <div className='flex h-8 items-center'>
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
            </div>
            <H1 className='mt-1 max-w-[1024px]'>The Evolution of Basketball: From Pastime to Professional and One of the Most Popular Sports</H1>
        </div>
    );
};

export default Header;
