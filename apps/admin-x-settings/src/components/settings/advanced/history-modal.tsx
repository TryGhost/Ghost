import InfiniteScrollListener from '../../infinite-scroll-listener';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {type Action, getActionTitle, getContextResource, getLinkTarget, isBulkAction, useBrowseActions} from '@tryghost/admin-x-framework/api/actions';
import {ActionList, ActionListItem, ActionListItemContent, Avatar, Button, Field, FieldLabel, LoadingIndicator, MultiSelectCombobox, NoValueLabel, NoValueLabelIcon, Popover, PopoverContent, PopoverTrigger, Switch, inputSurface} from '@tryghost/shade/components';
import {ChevronDown, History, Pen, Plus, Trash2, X} from 'lucide-react';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingsModal} from '@tryghost/shade/patterns';
import {type User} from '@tryghost/admin-x-framework/api/users';
import {formatNumber} from '@tryghost/shade/utils';
import {keepPreviousData} from '@tanstack/react-query';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {useFilterableApi} from '@tryghost/admin-x-framework/hooks';

const HistoryIcon: React.FC<{action: Action}> = ({action}) => {
    let Icon = Pen;

    switch (action.event) {
    case 'added':
        Icon = Plus;
        break;
    case 'deleted':
        Icon = Trash2;
        break;
    }

    return <Icon className='size-3' />;
};

const HistoryAvatar: React.FC<{action: Action}> = ({action}) => {
    return (
        <div className='relative shrink-0'>
            <Avatar
                className='size-10'
                name={action.actor?.name || action.actor?.slug}
                src={action.actor?.image}
            />
            <div className='absolute -right-1 -bottom-1 z-30 flex items-center justify-center rounded-full border border-border-default bg-background p-1 shadow-sm'>
                <HistoryIcon action={action} />
            </div>
        </div>
    );
};

const HistoryFilterToggle: React.FC<{
    label: string;
    item: string;
    excludedItems: string[];
    toggleItem: (item: string, included: boolean) => void;
}> = ({label, item, excludedItems, toggleItem}) => {
    const id = useId();

    return (
        <Field orientation='horizontal'>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Switch
                checked={!excludedItems.includes(item)}
                id={id}
                onCheckedChange={checked => toggleItem(item, checked)}
            />
        </Field>
    );
};

const HistoryFilter: React.FC<{
    userId?: string;
    excludedEvents: string[];
    excludedResources: string[];
    toggleEventType: (event: string, included: boolean) => void;
    toggleResourceType: (resource: string, included: boolean) => void;
}> = ({userId, excludedEvents, excludedResources, toggleEventType, toggleResourceType}) => {
    const {updateRoute} = useRouting();
    const usersApi = useFilterableApi<User, 'users', 'name'>({path: '/users/', filterKey: 'name', responseKey: 'users'});

    const [staffOptions, setStaffOptions] = useState<Array<{label: string; value: string}>>([]);
    const [searchedStaff, setSearchStaff] = useState<{label: string; value: string} | null>();
    const [staffOpen, setStaffOpen] = useState(false);
    const [staffLoading, setStaffLoading] = useState(false);
    const requestSequence = useRef(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const usersApiRef = useRef(usersApi);
    usersApiRef.current = usersApi;
    const loadOptions = useCallback(async (input: string, request: number) => {
        try {
            const users = await usersApiRef.current.loadData(input);
            if (request === requestSequence.current) {
                setStaffOptions(users.map(user => ({label: user.name, value: user.id})));
            }
        } catch {
            if (request === requestSequence.current) {
                setStaffOptions([]);
            }
        } finally {
            if (request === requestSequence.current) {
                setStaffLoading(false);
            }
        }
    }, []);
    const requestOptions = useCallback((input: string, deferred = false) => {
        requestSequence.current += 1;
        const request = requestSequence.current;
        setStaffLoading(true);
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }
        if (deferred) {
            searchTimer.current = setTimeout(() => void loadOptions(input, request), 500);
        } else {
            void loadOptions(input, request);
        }
    }, [loadOptions]);

    useEffect(() => {
        requestOptions('');
        return () => {
            requestSequence.current += 1;
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }
        };
    }, [requestOptions]);

    useEffect(() => {
        let cancelled = false;

        if (!userId) {
            setSearchStaff(null);
            return;
        }

        void usersApiRef.current.loadInitialValues([userId], 'id').then(([user]) => {
            if (!cancelled && user) {
                const selected = {label: user.name, value: user.id};
                setSearchStaff(selected);
                setStaffOptions(options => options.some(option => option.value === selected.value) ? options : [selected, ...options]);
            }
        }).catch(() => {
            if (!cancelled) {
                setSearchStaff(null);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const resetStaff = () => {
        setSearchStaff(null);
    };

    return (
        <Inline align='center' gap='md'>
            <Popover>
                <PopoverTrigger asChild>
                    <Button type='button' variant='outline'>Filter</Button>
                </PopoverTrigger>
                <PopoverContent align='end' className='z-[9999] w-[220px]' data-testid='history-filters'>
                    <Stack gap='2xl'>
                        <Stack gap='md'>
                            <HistoryFilterToggle excludedItems={excludedEvents} item='added' label='Added' toggleItem={toggleEventType} />
                            <HistoryFilterToggle excludedItems={excludedEvents} item='edited' label='Edited' toggleItem={toggleEventType} />
                            <HistoryFilterToggle excludedItems={excludedEvents} item='deleted' label='Deleted' toggleItem={toggleEventType} />
                        </Stack>
                        <Stack gap='md'>
                            <HistoryFilterToggle excludedItems={excludedResources} item='post' label='Posts' toggleItem={toggleResourceType} />
                            <HistoryFilterToggle excludedItems={excludedResources} item='page' label='Pages' toggleItem={toggleResourceType} />
                            <HistoryFilterToggle excludedItems={excludedResources} item='tag' label='Tags' toggleItem={toggleResourceType} />
                            <HistoryFilterToggle excludedItems={excludedResources} item='offer,product' label='Tiers & offers' toggleItem={toggleResourceType} />
                            <HistoryFilterToggle excludedItems={excludedResources} item='api_key,integration,setting,user,webhook' label='Settings & staff' toggleItem={toggleResourceType} />
                        </Stack>
                    </Stack>
                </PopoverContent>
            </Popover>
            <div className='w-[200px]'>
                <Inline className={`${inputSurface('within')} relative h-(--control-height) overflow-hidden`} gap='none'>
                    <Popover open={staffOpen} onOpenChange={(open) => {
                        setStaffOpen(open);
                        if (open) {
                            requestOptions('');
                        }
                    }}>
                        <PopoverTrigger asChild>
                            <button aria-label='Staff' className='flex min-w-0 flex-1 items-center justify-between px-3 text-control' data-testid='history-staff-filter' role='combobox' type='button'>
                                <span className={searchedStaff ? 'truncate pr-8' : 'truncate pr-8 text-muted-foreground'}>{searchedStaff?.label ?? 'Search staff'}</span>
                                <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align='start' className='z-[9999] w-72 p-0'>
                            <MultiSelectCombobox
                                i18n={{searchPlaceholder: 'Search staff'}}
                                isLoading={staffLoading}
                                isMultiSelect={false}
                                options={searchedStaff && !staffOptions.some(option => option.value === searchedStaff.value) ? [searchedStaff, ...staffOptions] : staffOptions}
                                shouldFilter={false}
                                values={searchedStaff ? [searchedStaff.value] : []}
                                autoCloseOnSelect
                                onChange={(values) => {
                                    const option = staffOptions.find(item => item.value === values[0]);
                                    if (option) {
                                        setSearchStaff(option);
                                        updateRoute(`history/view/${option.value}`);
                                    }
                                }}
                                onClose={() => setStaffOpen(false)}
                                onSearchChange={input => requestOptions(input, true)}
                            />
                        </PopoverContent>
                    </Popover>
                    {searchedStaff && (
                        <button aria-label='Clear selection' className='absolute top-1/2 right-10 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground' type='button' onClick={() => {
                            resetStaff();
                            updateRoute('history/view');
                        }}>
                            <X className='size-4' />
                        </button>
                    )}
                </Inline>
            </div>
        </Inline>
    );
};

const HistoryActionDescription: React.FC<{action: Action}> = ({action}) => {
    const {updateRoute} = useRouting();
    const contextResource = getContextResource(action);

    if (action.resource_type === 'security_action' && action.context?.action_name === 'reset_authentication') {
        const apiKeysRotated = typeof action.context.api_keys_rotated === 'number' ? action.context.api_keys_rotated : null;
        const usersLocked = typeof action.context.users_locked === 'number' ? action.context.users_locked : null;
        const details = [
            apiKeysRotated !== null ? `${formatNumber(apiKeysRotated)} API ${apiKeysRotated === 1 ? 'key' : 'keys'} rotated` : null,
            usersLocked !== null ? `${formatNumber(usersLocked)} ${usersLocked === 1 ? 'user' : 'users'} locked` : null
        ].filter(Boolean);

        return <>{details.length ? details.join(', ') : 'Authentication reset'}</>;
    } else if (contextResource) {
        const {group, key} = contextResource;

        return <>
            {group.slice(0, 1).toUpperCase()}{group.slice(1)}
            {group !== key && <span> <code className='mb-1 bg-white text-grey-800 dark:bg-grey-900 dark:text-white'>({key})</code></span>}
        </>;
    } else if (action.resource?.title || action.resource?.name || action.context?.primary_name) {
        const linkTarget = getLinkTarget(action);

        if (linkTarget) {
            return <a className='cursor-pointer font-bold' onClick={(e) => {
                e.preventDefault();
                updateRoute(linkTarget);
            }}>{action.resource?.title || action.resource?.name}</a>;
        } else {
            return <>{action.resource?.title || action.resource?.name || action.context?.primary_name}</>;
        }
    } else {
        return <span className='text-grey-500'>(unknown)</span>;
    }
};

const formatDateForFilter = (date: Date) => {
    const partsList = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).formatToParts(date);

    const parts = partsList.reduce<Record<string, string>>((result, {type, value}) => ({...result, [type]: value}), {});

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const PAGE_SIZE = 200;

const HistoryModal = NiceModal.create<RoutingModalProps>(({params}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    const [excludedEvents, setExcludedEvents] = useState<string[]>([]);
    const [excludedResources, setExcludedResources] = useState<string[]>(['label']);

    const {data, fetchNextPage, isFetchingNextPage} = useBrowseActions({
        searchParams: {
            include: 'actor,resource',
            limit: PAGE_SIZE.toString(),
            filter: [
                excludedEvents.length && `event:-[${excludedEvents.join(',')}]`,
                excludedResources.length && `resource_type:-[${excludedResources.join(',')}]`,
                params?.user && `actor_id:'${params.user}'`
            ].filter(Boolean).join('+')
        },
        getNextPageParams: (lastPage, otherParams) => ({
            ...otherParams,
            filter: [otherParams.filter, lastPage.actions.length && `created_at:<'${formatDateForFilter(new Date(lastPage.actions[lastPage.actions.length - 1].created_at))}'`].join('+')
        }),
        placeholderData: keepPreviousData
    });

    const fetchNext = useCallback(() => {
        if (!data?.isEnd) {
            fetchNextPage();
        }
    }, [data?.isEnd, fetchNextPage]);

    const toggleValue = (setter: (fn: (values: string[]) => string[]) => void, value: string, included: boolean) => {
        setter(values => (included ? values.concat(value) : values.filter(current => current !== value)));
    };

    const hasActiveFilters = excludedEvents.length > 0 || excludedResources.length > 0 || params?.user;

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('history');
            }}
            cancelLabel=''
            okLabel='Close'
            scrolling={true}
            size='md'
            stickyFooter={true}
            stickyHeader={true}
            testId='history-modal'
            title='History'
            topRightContent={<HistoryFilter
                excludedEvents={excludedEvents}
                excludedResources={excludedResources}
                toggleEventType={(event, included) => toggleValue(setExcludedEvents, event, !included)}
                toggleResourceType={(resource, included) => toggleValue(setExcludedResources, resource, !included)}
                userId={params?.user}
            />}
            onOk={() => {
                modal.remove();
                updateRoute('history');
            }}
        >
            <div className='relative mt-6'>
                <ActionList>
                    {data?.actions ? (
                        data.actions.length > 0 ? (
                            <>
                                <InfiniteScrollListener offset={250} onTrigger={fetchNext} />
                                {data.actions.map(action => !action.skip && <ActionListItem key={action.id}>
                                    <ActionListItemContent className='flex items-center gap-3 py-3'>
                                        <HistoryAvatar action={action} />
                                        <div className='min-w-0 grow'>
                                            <div>
                                            {getActionTitle(action)}{isBulkAction(action) ? '' : ': '}
                                            {!isBulkAction(action) && <HistoryActionDescription action={action} />}
                                            {action.count ? <> {formatNumber(action.count)} times</> : null}
                                            <span> &mdash; by {action.actor?.name || action.actor?.slug}</span>
                                            </div>
                                            <div className='text-sm text-muted-foreground'>
                                                {[
                                                    new Date(action.created_at).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}),
                                                    new Date(action.created_at).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit', second: '2-digit'})
                                                ].join(' | ')}
                                            </div>
                                        </div>
                                    </ActionListItemContent>
                                </ActionListItem>)}
                                {isFetchingNextPage && (
                                    <div className="flex items-center justify-center p-5">
                                        <LoadingIndicator size='md' />
                                    </div>
                                )}
                            </>
                        ) : (
                            <NoValueLabel>
                                <NoValueLabelIcon><History /></NoValueLabelIcon>
                                {hasActiveFilters ?
                                    'No entries match your current filters.' :
                                    'No history entries found.'
                                }
                            </NoValueLabel>
                        )
                    ) : data === undefined ? (
                        <div className="flex items-center justify-center px-5 pt-12 pb-10">
                            <div className="flex h-64 items-center justify-center">
                                <LoadingIndicator size='lg' />
                            </div>
                        </div>
                    ) : (
                        <NoValueLabel>No entries found.</NoValueLabel>
                    )}
                    {data?.isEnd && data.actions.length > 0 && <div className='border-t border-border pt-2 text-sm text-muted-foreground'>End of history log</div>}
                </ActionList>
            </div>
        </SettingsModal>
    );
});

export default HistoryModal;
