import {Badge, Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {type Offer, useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {type RetentionOffer, getRetentionOffers} from './offers-retention';
import {SettingsModal} from '@tryghost/shade/patterns';
import {type Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {createOfferRedemptionFilterUrl, createOfferRedemptionsFilterUrl, getOfferCadence, getOfferDiscount, getOfferDuration} from './offer-helpers';
import {toast} from 'sonner';
import {useOffersShowArchived, useSortingState} from '@/settings/providers/settings-app-context';
import {useSettingsNavigation} from '@/settings/hooks/use-settings-navigation';

const OffersFilterMenu: React.FC<{
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    sortOption: string;
    sortDirection: string;
    onSortChange: (option: string) => void;
    onDirectionChange: () => void;
}> = ({showArchived, setShowArchived, sortOption, sortDirection, onSortChange, onDirectionChange}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label='Filter options' className='text-muted-foreground hover:text-foreground' size='icon' type='button' variant='ghost'>
                    <LucideIcon.ListFilter size={16} strokeWidth={1.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='z-[9999] min-w-[200px] normal-case'>
                <DropdownMenuLabel className='text-xs tracking-wide text-muted-foreground uppercase'>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={onSortChange}>
                    <DropdownMenuRadioItem value='date-added'>Date added</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='name'>Name</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='redemptions'>Redemptions</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuItem onSelect={onDirectionChange}>
                    {sortDirection === 'asc' ? <LucideIcon.ArrowUp className='size-3' /> : <LucideIcon.ArrowDown className='size-3' />}
                    {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={checked => setShowArchived(Boolean(checked))}>
                    Show archived
                </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const RetentionOfferRow: React.FC<{
    offer: RetentionOffer;
    onClick: () => void;
}> = ({offer, onClick}) => {
    const redemptionFilterUrl = offer.redemptions > 0 && offer.redemptionOfferIds.length > 0
        ? createOfferRedemptionsFilterUrl(offer.redemptionOfferIds)
        : undefined;

    return (
        <TableRow data-testid='retention-offer-item'>
            <TableCell className='sticky left-0 z-10 bg-background p-0'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    <Stack gap='none'>
                        <span className='font-semibold'>{offer.name}</span>
                        <span className='text-muted-foreground'>{offer.description}</span>
                    </Stack>
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    {offer.terms ? (
                        <Stack gap='none'>
                            <span className='text-sm font-medium uppercase'>{offer.terms}</span>
                            <span className='text-muted-foreground'>{offer.termsDetail}</span>
                        </Stack>
                    ) : (
                        <span className='text-muted-foreground'>&ndash;</span>
                    )}
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    <span className='text-muted-foreground'>&ndash;</span>
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                {redemptionFilterUrl ? (
                    <a
                        className='block cursor-pointer p-5 hover:underline'
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        href={redemptionFilterUrl}
                    >
                        {formatNumber(offer.redemptions)}
                    </a>
                ) : (
                    <button
                        className='block w-full cursor-pointer p-5 text-left'
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        type="button"
                        onClick={onClick}
                    >
                        {formatNumber(offer.redemptions)}
                    </button>
                )}
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    {offer.status === 'active' ? (
                        <Badge className='rounded-full uppercase' variant='success'>Active</Badge>
                    ) : (
                        <Badge className='rounded-full uppercase' variant='secondary'>Inactive</Badge>
                    )}
                </button>
            </TableCell>
        </TableRow>
    );
};

const SignupOfferRow: React.FC<{
    archived: boolean;
    offer: Offer;
    tier: Tier;
    onClick: () => void;
}> = ({archived, offer, tier, onClick}) => {
    const {discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(offer.type, offer.amount, offer.cadence, offer.currency || 'USD', tier);

    return (
        <TableRow className={archived ? 'opacity-60' : undefined} data-testid='offer-item'>
            <TableCell className='sticky left-0 z-10 bg-background p-0'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    <Stack gap='none'>
                        <span className='font-semibold'>{offer.name}</span>
                        <span className='text-muted-foreground'>{tier.name} {getOfferCadence(offer.cadence)}</span>
                    </Stack>
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    <Stack gap='none'>
                        <span className='text-sm font-medium uppercase'>{discountOffer}</span>
                        <span className='text-muted-foreground'>{offer.type !== 'trial' ? getOfferDuration(offer.duration) : 'Trial period'}</span>
                    </Stack>
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    <span className='font-medium'>{updatedPriceWithCurrency}</span> {offer.type !== 'trial' ? <span className='relative text-sm text-muted-foreground before:absolute before:-inset-x-0.5 before:top-1/2 before:rotate-[-20deg] before:border-t before:content-[""]'>{originalPriceWithCurrency}</span> : null}
                </button>
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                {offer.redemption_count > 0 && offer.id ? (
                    <a className='block cursor-pointer p-5 hover:underline' href={createOfferRedemptionFilterUrl(offer.id)}>{formatNumber(offer.redemption_count)}</a>
                ) : (
                    <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>{formatNumber(offer.redemption_count)}</button>
                )}
            </TableCell>
            <TableCell className='p-0 whitespace-nowrap'>
                <button className='block w-full cursor-pointer p-5 text-left' type='button' onClick={onClick}>
                    {archived ? (
                        <Badge className='rounded-full uppercase' variant='secondary'>Archived</Badge>
                    ) : (
                        <Badge className='rounded-full uppercase' variant='success'>Active</Badge>
                    )}
                </button>
            </TableCell>
        </TableRow>
    );
};

type OfferListItem =
    | {kind: 'retention'; offer: RetentionOffer}
    | {kind: 'signup'; offer: Offer};

const getOfferListItemName = (item: OfferListItem): string => item.offer.name;
const getOfferListItemRedemptions = (item: OfferListItem): number => item.kind === 'retention' ? item.offer.redemptions : item.offer.redemption_count;
const getOfferListItemCreatedAt = (item: OfferListItem): string | null => item.kind === 'retention' ? item.offer.createdAt : item.offer.created_at || null;

const sortOfferListItems = (items: OfferListItem[], sortOption: string, sortDirection: string): OfferListItem[] => {
    const multiplier = sortDirection === 'desc' ? -1 : 1;

    return [...items].sort((item1, item2) => {
        let result: number;

        switch (sortOption) {
        case 'name':
            result = getOfferListItemName(item1).localeCompare(getOfferListItemName(item2));
            break;
        case 'redemptions':
            result = getOfferListItemRedemptions(item1) - getOfferListItemRedemptions(item2);
            break;
        default: {
            const date1 = getOfferListItemCreatedAt(item1);
            const date2 = getOfferListItemCreatedAt(item2);

            if (!date1 && !date2) {
                result = 0;
            } else if (!date1) {
                return 1;
            } else if (!date2) {
                return -1;
            } else {
                result = new Date(date1).getTime() - new Date(date2).getTime();
            }
            break;
        }
        }

        return (result || getOfferListItemName(item1).localeCompare(getOfferListItemName(item2))) * multiplier;
    });
};

export const OffersIndexModal: React.FC = () => {
    const {updateRoute} = useSettingsNavigation();
    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const signupOffers = allOffers.filter(offer => offer.redemption_type === 'signup');
    const retentionOffers = getRetentionOffers(allOffers);
    const {sortingState, setSortingState} = useSortingState();
    const offersSorting = sortingState?.find(sorting => sorting.type === 'offers');

    const {offersShowArchived: showArchived, setOffersShowArchived: setShowArchived} = useOffersShowArchived();

    const sortOption = offersSorting?.option || 'date-added';
    const sortDirection = offersSorting?.direction || 'desc';

    const handleOfferEdit = (id: string) => {
        if (!id) {
            return;
        }
        updateRoute(`offers/edit/${id}`);
    };

    const handleRetentionOfferEdit = (id: string) => {
        updateRoute(`offers/edit/retention/${id}`);
    };

    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const filteredSignupOffers = signupOffers.filter((offer) => {
        const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);
        const isActive = offer.status === 'active' && offerTier && offerTier.active === true;
        const isArchived = offer.status === 'archived' || (offerTier && offerTier.active === false);

        if (isActive) {
            return true;
        }
        if (showArchived && isArchived) {
            return true;
        }
        return false;
    });

    const sortedOfferListItems = sortOfferListItems([
        ...retentionOffers.map(offer => ({kind: 'retention' as const, offer})),
        ...filteredSignupOffers.map(offer => ({kind: 'signup' as const, offer}))
    ], sortOption, sortDirection);

    const handleSortChange = (selectedOption: string) => {
        setSortingState?.([{
            type: 'offers',
            option: selectedOption,
            direction: sortDirection
        }]);
    };

    const handleDirectionChange = () => {
        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortingState?.([{
            type: 'offers',
            option: sortOption,
            direction: newDirection
        }]);
    };

    const isOfferArchived = (offer: typeof signupOffers[0]) => {
        const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);
        return offer.status === 'archived' || offerTier?.active === false;
    };

    const actions = (
        <Inline gap='md'>
            <Button type='button' variant='outline' onClick={() => {
                updateRoute('offers');
            }}>Close</Button>
            <Button type='button' onClick={() => {
                if (paidActiveTiers.length === 0) {
                    toast.info('You must have an active tier to create an offer.');
                } else {
                    updateRoute('offers/new');
                }
            }}>
                New offer
            </Button>
        </Inline>
    );

    const listLayoutOutput = <div className='overflow-x-auto'>
        <Table className='m-0 min-w-[900px]'>
            <colgroup>
                <col className='w-[25%]' />
                <col className='w-[200px]' />
                <col className='w-[200px]' />
                <col className='w-[200px]' />
                <col className='w-[220px]' />
            </colgroup>
            <TableHeader>
                <TableRow>
                    <TableHead className='sticky left-0 z-10 h-auto bg-background p-0 pb-2.5 pl-5 uppercase'>Name</TableHead>
                    <TableHead className='h-auto p-0 pb-2.5 pl-5 uppercase'>Terms</TableHead>
                    <TableHead className='h-auto p-0 pb-2.5 pl-5 uppercase'>Price</TableHead>
                    <TableHead className='h-auto p-0 pb-2.5 pl-5 uppercase'>Redemptions</TableHead>
                    <TableHead className='h-auto p-0 px-5 pb-2.5 uppercase'>
                        <Inline align='center' justify='between'>
                            Status
                            <OffersFilterMenu
                                setShowArchived={setShowArchived}
                                showArchived={showArchived}
                                sortDirection={sortDirection}
                                sortOption={sortOption}
                                onDirectionChange={handleDirectionChange}
                                onSortChange={handleSortChange}
                            />
                        </Inline>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody data-testid='offers-table-body'>
                {sortedOfferListItems.map((item) => {
                    if (item.kind === 'retention') {
                        return (
                            <RetentionOfferRow
                                key={`retention-${item.offer.id}`}
                                offer={item.offer}
                                onClick={() => handleRetentionOfferEdit(item.offer.id)}
                            />
                        );
                    }

                    const offer = item.offer;
                    const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);

                    if (!offerTier) {
                        return null;
                    }

                    const archived = isOfferArchived(offer);

                    return (
                        <SignupOfferRow
                            key={`signup-${offer.id}`}
                            archived={archived}
                            offer={offer}
                            tier={offerTier}
                            onClick={() => handleOfferEdit(offer.id)}
                        />
                    );
                })}
            </TableBody>
        </Table>
    </div>;

    return <SettingsModal
        animate={false}
        backDropClick={false}
        cancelLabel=''
        footer={false}
        height='full'
        size='lg'
        testId='offers-modal'
        title='Offers'
        topRightContent={actions}
        width={1140}
        onClose={() => {
            updateRoute('offers');
        }}
    >
        <Stack className='h-full pt-8'>
            {listLayoutOutput}
        </Stack>
    </SettingsModal>;
};
