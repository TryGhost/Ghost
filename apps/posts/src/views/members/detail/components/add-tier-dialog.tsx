import moment from 'moment-timezone';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getActiveStripeSubscriptions} from '../subscription-data';
import {useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

const EXPIRY_OPTIONS = [
    {label: 'Forever', duration: 'forever'},
    {label: '1 Week', duration: 'week'},
    {label: '1 Month', duration: 'month'},
    {label: '6 Months', duration: 'half-year'},
    {label: '1 Year', duration: 'year'},
    {label: 'Custom', duration: 'custom'}
];

/** Port of the Ember modal-member-tier expiry computation. */
export function computeExpiryAt(duration: string, customExpiryDate?: string): string | null {
    if (duration === 'week') {
        return moment.utc().add(7, 'days').startOf('day').toISOString();
    }
    if (duration === 'month') {
        return moment.utc().add(1, 'month').startOf('day').toISOString();
    }
    if (duration === 'half-year') {
        return moment.utc().add(6, 'months').startOf('day').toISOString();
    }
    if (duration === 'year') {
        return moment.utc().add(1, 'year').startOf('day').toISOString();
    }
    if (duration === 'custom' && customExpiryDate) {
        return moment(customExpiryDate)
            .endOf('day')
            .set('milliseconds', 0) // Prevent db rounding up to the next day
            .add(moment().utcOffset(), 'minutes') // Adjust for timezone offset
            .toISOString();
    }
    return null;
}

/**
 * "Add complimentary subscription" modal: pick a paid tier and an expiry.
 * Port of the Ember modal-member-tier component.
 */
export function AddTierDialog({member, tiers, open, onOpenChange, onConfirm}: {
    member: Member;
    tiers: Tier[];
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: (tierId: string, expiryAt: string | null) => Promise<void>;
}) {
    const [selectedTier, setSelectedTier] = useState<string | null>(tiers[0]?.id ?? null);
    const [expiryAt, setExpiryAt] = useState('forever');
    const [customExpiryDate, setCustomExpiryDate] = useState(moment().format('YYYY-MM-DD'));
    const [isAdding, setIsAdding] = useState(false);

    const activeSubscriptions = getActiveStripeSubscriptions(member.subscriptions);
    const tierId = selectedTier ?? tiers[0]?.id;

    const handleConfirm = async () => {
        if (!tierId) {
            return;
        }
        setIsAdding(true);
        try {
            await onConfirm(tierId, computeExpiryAt(expiryAt, customExpiryDate));
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add subscription</DialogTitle>
                    <DialogDescription>
                        Select a tier for <strong>{member.name || member.email}</strong>&rsquo;s complimentary subscription.
                    </DialogDescription>
                </DialogHeader>

                {activeSubscriptions.length > 0 && (
                    <p className="text-sm text-yellow-600">
                        Adding a complimentary subscription cancels all existing subscriptions of this member.
                    </p>
                )}

                <div className="flex flex-col gap-2" role="radiogroup">
                    {tiers.map(tier => (
                        <button
                            key={tier.id}
                            aria-checked={tierId === tier.id}
                            className={`flex items-center justify-between rounded-md border p-3 text-left ${tierId === tier.id ? 'border-green ring-1 ring-green' : ''}`}
                            role="radio"
                            type="button"
                            onClick={() => setSelectedTier(tier.id)}
                        >
                            <span>
                                <span className="block font-semibold">{tier.name}</span>
                                {tier.description && <span className="block text-sm text-muted-foreground">{tier.description}</span>}
                            </span>
                            {tierId === tier.id && <LucideIcon.Check className="size-4 text-green" />}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="complimentary-duration">Duration</Label>
                    <Select value={expiryAt} onValueChange={setExpiryAt}>
                        <SelectTrigger id="complimentary-duration">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EXPIRY_OPTIONS.map(option => (
                                <SelectItem key={option.duration} value={option.duration}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {expiryAt === 'custom' && (
                        <Input
                            aria-label="Custom expiry date"
                            min={moment().format('YYYY-MM-DD')}
                            type="date"
                            value={customExpiryDate}
                            onChange={e => setCustomExpiryDate(e.target.value)}
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={isAdding || !tierId} type="button" onClick={handleConfirm}>
                        Add subscription
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
