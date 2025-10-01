import React from 'react';
import {Button, Header, PageMenu, PageMenuItem} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';

interface TagsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const TagsHeader: React.FC<TagsHeaderProps> = ({currentTab}) => {
    return (
        <Header variant="inline-nav">
            <Header.Title>Tags</Header.Title>

            <Header.Nav>
                <PageMenu data-testid="tags-header-tabs" defaultValue={currentTab}>
                    <PageMenuItem value="public" asChild>
                        <Link to="/tags">Public tags</Link>
                    </PageMenuItem>
                    <PageMenuItem value="internal" asChild>
                        <Link to="/tags?type=internal">Internal tags</Link>
                    </PageMenuItem>
                </PageMenu>
            </Header.Nav>

            <Header.Actions>
                <Button asChild>
                    <a className="font-bold" href="#/tags/new">
                        New tag
                    </a>
                </Button>
            </Header.Actions>
        </Header>
    );
};

export default TagsHeader;
