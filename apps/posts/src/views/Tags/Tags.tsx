import React from 'react';
import TagsContent from './components/TagsContent';
import TagsHeader from './components/TagsHeader';
import TagsLayout from './components/TagsLayout';
import TagsList from './components/TagsList';
import {Button, LoadingIndicator, LucideIcon} from '@tryghost/shade';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {useLocation} from '@tryghost/admin-x-framework';

const Tags: React.FC = () => {
    const {search} = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get('type') ?? 'public';

    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useBrowseTags({
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
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading tags
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : !data?.tags.length ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center gap-8">
                        <LucideIcon.Tags className="-mb-4 size-16 text-muted-foreground" strokeWidth={1} />
                        <h2 className="text-xl font-medium">
                            Start organizing your content
                        </h2>
                        <Button asChild>
                            <a href="#/tags/new">Create a new tag</a>
                        </Button>
                    </div>
                ) : (
                    <TagsList
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        items={data?.tags ?? []}
                        totalItems={data?.meta?.pagination?.total ?? 0}
                    />
                )}
            </TagsContent>
        </TagsLayout>
    );
};

export default Tags;
