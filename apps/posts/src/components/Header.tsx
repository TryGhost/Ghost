import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, H1} from '@tryghost/shade';

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
            <H1 className='mt-1 max-w-[1024px]'>The Evolution of Basketball: From Pastime to Professional and One of the Most Popular Sports</H1>
        </div>
    );
};

export default Header;
