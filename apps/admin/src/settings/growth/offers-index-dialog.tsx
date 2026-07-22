import { useState } from "react";
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@tryghost/shade/components";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { type Offer, useBrowseOffers } from "@tryghost/admin-x-framework/api/offers";
import { getPaidActiveTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useNavigate } from "@tryghost/admin-x-framework";
import { type RetentionOffer, getRetentionOffers } from "@tryghost/admin-x-settings/src/components/settings/growth/offers/offers-retention";
import { createOfferRedemptionFilterUrl, createOfferRedemptionsFilterUrl } from "@tryghost/admin-x-settings/src/components/settings/growth/offers/offer-helpers";

import { getOfferCadence, getOfferDiscount, getOfferDuration } from "./offer-display-utils";
import { showToast } from "@/settings/app/shared/toast";

/**
 * The routed offers index (`/settings/offers/edit`), replacing the legacy
 * offers-index.tsx container modal: shade Table instead of the hand-rolled
 * `<table>`, shade Badges for the status pills, and the sort/filter menu as
 * shade DropdownMenu radio items — same column set, sorting semantics and
 * sticky name column.
 */

const CELL_BUTTON_CLASSES = "block w-full cursor-pointer p-5 text-left";

function StatusBadge({ active, label }: { active: boolean; label: string }) {
    return (
        <Badge className="rounded-full py-0.5 tracking-wide uppercase" variant={active ? "success" : "secondary"}>
            {label}
        </Badge>
    );
}

function OffersFilterMenu({ showArchived, setShowArchived, sortOption, sortDirection, onSortChange, onDirectionChange }: {
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    sortOption: string;
    sortDirection: string;
    onSortChange: (option: string) => void;
    onDirectionChange: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label="Filter options" className="text-muted-foreground hover:text-foreground" size="icon" variant="ghost">
                    <LucideIcon.ListFilter size={16} strokeWidth={1.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] normal-case">
                <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground uppercase">Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={onSortChange}>
                    <DropdownMenuRadioItem value="date-added">Date added</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="redemptions">Redemptions</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuItem onSelect={onDirectionChange}>
                    {sortDirection === "asc" ? <LucideIcon.ArrowUp className="size-3.5" /> : <LucideIcon.ArrowDown className="size-3.5" />}
                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={(checked) => setShowArchived(Boolean(checked))}>
                    Show archived
                </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function RetentionOfferRow({ offer, onClick }: {
    offer: RetentionOffer;
    onClick: () => void;
}) {
    const redemptionFilterUrl = offer.redemptions > 0 && offer.redemptionOfferIds.length > 0
        ? createOfferRedemptionsFilterUrl(offer.redemptionOfferIds)
        : undefined;

    return (
        <TableRow data-testid="retention-offer-item">
            <td className="sticky left-0 z-10 bg-background p-0">
                <button className={cn(CELL_BUTTON_CLASSES, "pl-0")} type="button" onClick={onClick}>
                    <span className="font-semibold">{offer.name}</span><br />
                    <span className="text-muted-foreground">{offer.description}</span>
                </button>
            </td>
            <td className="p-0 whitespace-nowrap">
                <button className={CELL_BUTTON_CLASSES} type="button" onClick={onClick}>
                    {offer.terms ? (
                        <>
                            <span className="text-sm font-medium uppercase">{offer.terms}</span><br />
                            <span className="text-muted-foreground">{offer.termsDetail}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">&ndash;</span>
                    )}
                </button>
            </td>
            <td className="p-0 whitespace-nowrap">
                <button className={CELL_BUTTON_CLASSES} type="button" onClick={onClick}>
                    <span className="text-muted-foreground">&ndash;</span>
                </button>
            </td>
            <td className="p-0 whitespace-nowrap">
                {redemptionFilterUrl ? (
                    <a
                        className="block cursor-pointer p-5 hover:underline"
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        href={redemptionFilterUrl}
                    >
                        {formatNumber(offer.redemptions)}
                    </a>
                ) : (
                    <button
                        className={CELL_BUTTON_CLASSES}
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        type="button"
                        onClick={onClick}
                    >
                        {formatNumber(offer.redemptions)}
                    </button>
                )}
            </td>
            <td className="p-0 whitespace-nowrap">
                <button className={CELL_BUTTON_CLASSES} type="button" onClick={onClick}>
                    <StatusBadge active={offer.status === "active"} label={offer.status === "active" ? "Active" : "Inactive"} />
                </button>
            </td>
        </TableRow>
    );
}

type OfferListItem =
    | { kind: "retention"; offer: RetentionOffer }
    | { kind: "signup"; offer: Offer };

const getOfferListItemName = (item: OfferListItem): string => item.offer.name;
const getOfferListItemRedemptions = (item: OfferListItem): number => (item.kind === "retention" ? item.offer.redemptions : item.offer.redemption_count);
const getOfferListItemCreatedAt = (item: OfferListItem): string | null => (item.kind === "retention" ? item.offer.createdAt : item.offer.created_at || null);

const sortOfferListItems = (items: OfferListItem[], sortOption: string, sortDirection: string): OfferListItem[] => {
    const multiplier = sortDirection === "desc" ? -1 : 1;

    return [...items].sort((item1, item2) => {
        let result: number;

        switch (sortOption) {
            case "name":
                result = getOfferListItemName(item1).localeCompare(getOfferListItemName(item2));
                break;
            case "redemptions":
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

export function OffersIndexDialog() {
    const navigate = useNavigate();
    const { data: { offers: allOffers = [] } = {} } = useBrowseOffers();
    const { data: { tiers: allTiers } = {} } = useBrowseTiers();
    const signupOffers = allOffers.filter((offer) => offer.redemption_type === "signup");
    const retentionOffers = getRetentionOffers(allOffers);

    const [showArchived, setShowArchived] = useState(false);
    const [sortOption, setSortOption] = useState("date-added");
    const [sortDirection, setSortDirection] = useState("desc");

    const handleOfferEdit = (id: string) => {
        if (!id) {
            return;
        }
        navigate(`/settings/offers/edit/${id}`);
    };

    const handleRetentionOfferEdit = (id: string) => {
        navigate(`/settings/offers/edit/retention/${id}`);
    };

    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const isOfferArchived = (offer: Offer) => {
        const offerTier = allTiers?.find((tier) => tier.id === offer?.tier?.id);
        return offer.status === "archived" || (offerTier && offerTier.active === false);
    };

    const filteredSignupOffers = signupOffers.filter((offer) => {
        const offerTier = allTiers?.find((tier) => tier.id === offer?.tier?.id);
        const isActive = offer.status === "active" && offerTier && offerTier.active === true;
        const isArchived = isOfferArchived(offer);

        if (isActive) {
            return true;
        }
        if (showArchived && isArchived) {
            return true;
        }
        return false;
    });

    const sortedOfferListItems = sortOfferListItems([
        ...retentionOffers.map((offer) => ({ kind: "retention" as const, offer })),
        ...filteredSignupOffers.map((offer) => ({ kind: "signup" as const, offer })),
    ], sortOption, sortDirection);

    const handleNewOffer = () => {
        if (paidActiveTiers.length === 0) {
            showToast({
                type: "info",
                title: "You must have an active tier to create an offer.",
            });
        } else {
            navigate("/settings/offers/new");
        }
    };

    const close = () => navigate("/settings/offers");

    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 gap-0 overflow-y-auto rounded-none sm:rounded-none"
                data-testid="offers-modal"
            >
                <div className="mx-auto flex h-full max-w-[1140px] flex-col px-8">
                    <header className="flex items-center justify-between pt-5 pb-8">
                        <DialogTitle>Offers</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={close}>Close</Button>
                            <Button onClick={handleNewOffer}><LucideIcon.Plus className="size-4" /> New offer</Button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        <Table className="m-0 min-w-[900px]">
                            <colgroup>
                                <col className="w-[25%]" />
                                <col className="w-[200px]" />
                                <col className="w-[200px]" />
                                <col className="w-[200px]" />
                                <col className="w-[220px]" />
                            </colgroup>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 z-10 bg-background px-0 uppercase">Name</TableHead>
                                    <TableHead className="pl-5 uppercase">Terms</TableHead>
                                    <TableHead className="pl-5 uppercase">Price</TableHead>
                                    <TableHead className="pl-5 uppercase">Redemptions</TableHead>
                                    <TableHead className="pl-5 uppercase">
                                        <span className="flex items-center justify-between">
                                            Status
                                            <OffersFilterMenu
                                                setShowArchived={setShowArchived}
                                                showArchived={showArchived}
                                                sortDirection={sortDirection}
                                                sortOption={sortOption}
                                                onDirectionChange={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                                onSortChange={setSortOption}
                                            />
                                        </span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody data-testid="offers-table-body">
                                {sortedOfferListItems.map((item) => {
                                    if (item.kind === "retention") {
                                        return (
                                            <RetentionOfferRow
                                                key={`retention-${item.offer.id}`}
                                                offer={item.offer}
                                                onClick={() => handleRetentionOfferEdit(item.offer.id)}
                                            />
                                        );
                                    }

                                    const offer = item.offer;
                                    const offerTier = allTiers?.find((tier) => tier.id === offer?.tier?.id);

                                    if (!offerTier) {
                                        return null;
                                    }

                                    const archived = isOfferArchived(offer);

                                    const { discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency } = getOfferDiscount(offer.type, offer.amount, offer.cadence, offer.currency || "USD", offerTier);

                                    return (
                                        <TableRow key={`signup-${offer.id}`} className={archived ? "opacity-60" : undefined} data-testid="offer-item">
                                            <td className="sticky left-0 z-10 bg-background p-0">
                                                <button className={cn(CELL_BUTTON_CLASSES, "pl-0")} type="button" onClick={() => handleOfferEdit(offer.id)}>
                                                    <span className="font-semibold">{offer?.name}</span><br />
                                                    <span className="text-muted-foreground">{offerTier.name} {getOfferCadence(offer.cadence)}</span>
                                                </button>
                                            </td>
                                            <td className="p-0 whitespace-nowrap">
                                                <button className={CELL_BUTTON_CLASSES} type="button" onClick={() => handleOfferEdit(offer.id)}>
                                                    <span className="text-sm font-medium uppercase">{discountOffer}</span><br />
                                                    <span className="text-muted-foreground">{offer.type !== "trial" ? getOfferDuration(offer.duration) : "Trial period"}</span>
                                                </button>
                                            </td>
                                            <td className="p-0 whitespace-nowrap">
                                                <button className={CELL_BUTTON_CLASSES} type="button" onClick={() => handleOfferEdit(offer.id)}>
                                                    <span className="font-medium">{updatedPriceWithCurrency}</span>{" "}
                                                    {offer.type !== "trial" ? <span className='relative text-sm text-muted-foreground before:absolute before:-inset-x-0.5 before:top-1/2 before:rotate-[-20deg] before:border-t before:content-[""]'>{originalPriceWithCurrency}</span> : null}
                                                </button>
                                            </td>
                                            <td className="p-0 whitespace-nowrap">
                                                {offer.redemption_count > 0 && offer.id ? (
                                                    <a className="block cursor-pointer p-5 hover:underline" href={createOfferRedemptionFilterUrl(offer.id)}>
                                                        {formatNumber(offer.redemption_count)}
                                                    </a>
                                                ) : (
                                                    <button className={CELL_BUTTON_CLASSES} type="button" onClick={() => handleOfferEdit(offer.id)}>
                                                        {formatNumber(offer.redemption_count)}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-0 whitespace-nowrap">
                                                <button className={CELL_BUTTON_CLASSES} type="button" onClick={() => handleOfferEdit(offer.id)}>
                                                    <StatusBadge active={!archived} label={archived ? "Archived" : "Active"} />
                                                </button>
                                            </td>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
