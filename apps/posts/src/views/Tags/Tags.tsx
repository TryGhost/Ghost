import React from 'react';
import TagsContent from './components/TagsContent';
import TagsHeader from './components/TagsHeader';
import TagsLayout from './components/TagsLayout';
import TagsList from './components/TagsList';
import {useLocation} from '@tryghost/admin-x-framework';

const Tags: React.FC = () => {
    const {search} = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get('type') ?? 'public';

    return (
        <TagsLayout>
            <TagsHeader currentTab={type} />
            <TagsContent>

                <TagsList items={[
                    {
                        id: 1,
                        name: 'Tag 1',
                        slug: 'tag-1',
                        count: 10
                    },
                    
                    {
                        id: 2,
                        name: 'Tag 2',
                        slug: 'tag-2',
                        count: 20
                    },
                    {
                        id: 3,
                        name: 'Tag 3',
                        slug: 'tag-3',
                        count: 30
                    }
                ]} />

            </TagsContent>
        </TagsLayout>
    );
};

export default Tags;
