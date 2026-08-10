import React from 'react';
import TagsList from './components/tags-list';
import {Box, Container} from '@tryghost/shade/primitives';
import {Button, DropdownMenuCheckboxItem, EmptyIndicator, LoadingIndicator, ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';
import {ListPage} from '@tryghost/shade/page-templates';
import {LucideIcon} from '@tryghost/shade/utils';
import {PageHeader} from '@tryghost/shade/patterns';
import {useBrowseTags} from '@tryghost/admin-x-framework/api/tags';

const Tags: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const type = searchParams.get('type') ?? 'public';

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
        <Box className='size-full'>
            <Container className='relative flex h-full flex-col' size='page'>
            <ListPage data-testid="tags-page">
                <ListPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Title>Tags</PageHeader.Title>
                        </PageHeader.Left>
                        <PageHeader.Actions>
                            <PageHeader.ActionGroup>
                                <ToggleGroup data-testid="tags-header-tabs" size='button' type="single" value={type}>
                                    <ToggleGroupItem aria-label="Public tags" value="public" asChild>
                                        <Link to="/tags">Public tags</Link>
                                    </ToggleGroupItem>
                                    <ToggleGroupItem aria-label="Internal tags" value="internal" asChild>
                                        <Link to="/tags?type=internal">Internal tags</Link>
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <PageHeader.ActionGroup.MobileMenu>
                                    <PageHeader.ActionGroup.MobileMenuTrigger>
                                        <Button variant='outline'>
                                            <LucideIcon.MoreHorizontal className='size-4' />
                                        </Button>
                                    </PageHeader.ActionGroup.MobileMenuTrigger>
                                    <PageHeader.ActionGroup.MobileMenuContent>
                                        <DropdownMenuCheckboxItem
                                            checked={type === 'public'}
                                            onCheckedChange={() => setSearchParams({})}
                                        >
                                            Public tags
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={type === 'internal'}
                                            onCheckedChange={() => setSearchParams({type: 'internal'})}
                                        >
                                            Internal tags
                                        </DropdownMenuCheckboxItem>
                                    </PageHeader.ActionGroup.MobileMenuContent>
                                </PageHeader.ActionGroup.MobileMenu>
                            </PageHeader.ActionGroup>
                            <PageHeader.ActionGroup>
                                <Button asChild>
                                    <a className="font-bold" href="#/tags/new">
                                        <LucideIcon.Plus className='size-4' />
                                        <span className='hidden sm:inline'>New tag</span>
                                    </a>
                                </Button>
                            </PageHeader.ActionGroup>
                        </PageHeader.Actions>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-1 flex-col items-center justify-center">
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
                        <div className="flex flex-1 items-center justify-center">
                            <EmptyIndicator
                                actions={
                                    <Button asChild>
                                        <a href="#/tags/new">Create a new tag</a>
                                    </Button>
                                }
                                title="Start organizing your content"
                            >
                                <LucideIcon.Tags />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <TagsList
                            fetchNextPage={() => void fetchNextPage()}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            items={data?.tags ?? []}
                            totalItems={data?.meta?.pagination?.total ?? 0}
                        />
                    )}
                </ListPage.Body>
            </ListPage>
            </Container>
        </Box>
    );
};

export default Tags;
