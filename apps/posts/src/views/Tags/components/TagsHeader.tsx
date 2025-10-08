import React from 'react';
import {Button, Header, ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

interface TagsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const TagsHeader: React.FC<TagsHeaderProps> = ({currentTab}) => {
    const navigate = useNavigate();

    return (
        <Header variant="inline-nav">
            <Header.Title>Tags</Header.Title>

            <Header.Nav>
                <ToggleGroup data-testid="tags-header-tabs" size='button' type="single" value={currentTab} onValueChange={(newTab) => {
                    navigate(newTab === 'internal' ? '/tags?type=internal' : '/tags');
                }}>
                    <ToggleGroupItem aria-label="Internal tags" value="public">
                        Public tags
                    </ToggleGroupItem>
                    <ToggleGroupItem aria-label="Internal tags" value="internal">
                        Internal tags
                    </ToggleGroupItem>
                </ToggleGroup>
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
