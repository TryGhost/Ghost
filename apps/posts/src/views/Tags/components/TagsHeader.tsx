import React from 'react';
import {Button, Header, ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';

interface TagsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const TagsHeader: React.FC<TagsHeaderProps> = ({currentTab}) => {
    return (
        <Header variant="inline-nav">
            <Header.Title>Tags</Header.Title>

            <Header.Actions>
                <Header.ActionGroup>
                    <ToggleGroup data-testid="tags-header-tabs" size='button' type="single" value={currentTab}>
                        <ToggleGroupItem aria-label="Public tags" value="public" asChild>
                            <Link to="/tags">
                            Public tags
                            </Link>
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label="Internal tags" value="internal" asChild>
                            <Link to="/tags?type=internal">
                            Internal tags
                            </Link>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </Header.ActionGroup>
                <Header.ActionGroup>
                    <Button asChild>
                        <a className="font-bold" href="#/tags/new">
                        New tag
                        </a>
                    </Button>
                </Header.ActionGroup>
            </Header.Actions>
        </Header>
    );
};

export default TagsHeader;
