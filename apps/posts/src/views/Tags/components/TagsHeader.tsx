import React from 'react';
import {
    Button,
    H1,
    Navbar,
    NavbarActions,
    PageMenu,
    PageMenuItem
} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';

interface TagsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const TagsHeader: React.FC<TagsHeaderProps> = ({currentTab}) => {
    return (
        <>
            <Navbar className="sticky top-0 z-50 p-4 -mb-4 lg:p-8 lg:-mb-8 flex-col items-start gap-y-2 lg:gap-y-4 border-none bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md md:flex-row md:items-center dark:bg-black">
                <H1 className="min-h-[35px] max-w-[920px] indent-0 leading-[1.2em] text-2xl lg:text-3xl">
                    Tags
                </H1>

                <NavbarActions className="justify-between w-full md:w-auto">
                    <PageMenu
                        className="min-h-[34px] pr-2 lg:pr-4"
                        defaultValue={currentTab}
                    >
                        <PageMenuItem value="public" asChild>
                            <Link to="/tags">Public tags</Link>
                        </PageMenuItem>
                        <PageMenuItem value="internal" asChild>
                            <Link to="/tags?type=internal">Internal tags</Link>
                        </PageMenuItem>
                    </PageMenu>
                    <Button asChild>
                        <a className="font-bold" href="#/tags/new">
                            New tag
                        </a>
                    </Button>
                </NavbarActions>
            </Navbar>
        </>
    );
};

export default TagsHeader;
