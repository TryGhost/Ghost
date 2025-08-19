import React from 'react';
import TagsContent from './components/TagsContent';
import TagsHeader from './components/TagsHeader';
import TagsLayout from './components/TagsLayout';
import TagsList from './components/TagsList';
import {LoadingIndicator} from '@tryghost/shade';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useLocation} from '@tryghost/admin-x-framework';

const Tags: React.FC = () => {
    const {search} = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get('type') ?? 'public';

    const {data, isLoading} = useBrowseTags({
        filter: {
            visibility: type
        }
    });

    return (
        <TagsLayout>
            <TagsHeader currentTab={type} />
            <TagsContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : (
                    <TagsList items={data?.tags ?? []} />
                )}
            </TagsContent>
        </TagsLayout>
    );
};

export default Tags;
