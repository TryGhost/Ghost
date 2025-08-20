import React from "react";
import TagsHeader from "./components/TagsHeader";
import TagsContent from "./components/TagsContent";
import TagsLayout from "./components/TagsLayout";
import { useLocation } from "@tryghost/admin-x-framework";
import TagsList from "./components/TagsList";
import { useBrowseTags } from "@tryghost/admin-x-framework/api/tags";
import { Button, LoadingIndicator } from "@tryghost/shade";
import TagsPlaceholder from "./assets/icons/tags-placeholder.svg";

const Tags: React.FC = () => {
    const { search } = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get("type") ?? "public";

    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
    } = useBrowseTags({
        filter: {
            visibility: type,
        },
    });

    return (
        <TagsLayout>
            <TagsHeader currentTab={type} />
            <TagsContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-full mb-16">
                        <h2 className="text-xl font-medium mb-2">
                            Error loading tags
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : !data?.tags.length ? (
                    <div className="flex flex-col items-center justify-center h-full gap-8 mb-16">
                        <img
                            src={TagsPlaceholder}
                            alt="Tags placeholder"
                            width={60}
                            height={60}
                        />
                        <h2 className="text-xl font-medium">
                            Start organizing your content
                        </h2>
                        <Button asChild>
                            <a href="#/tags/new">Create a new tag</a>
                        </Button>
                    </div>
                ) : (
                    <TagsList
                        items={data?.tags ?? []}
                        totalCount={data?.meta?.pagination?.total ?? 0}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        fetchNextPage={fetchNextPage}
                    />
                )}
            </TagsContent>
        </TagsLayout>
    );
};

export default Tags;
