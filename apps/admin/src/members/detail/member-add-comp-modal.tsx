import React from 'react';
import moment from 'moment-timezone';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, LoadingIndicator, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {classifyMemberSubscription} from './member-subscription';
import {computeCompExpiryAt, isCompExpiryDuration} from './member-comp-tier';
import {toast} from 'sonner';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useEditMember, useEditMemberSubscription} from '@tryghost/admin-x-framework/api/members';
import type {CompExpiryDuration} from './member-comp-tier';
import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';

// Ember cancels only subs in these Stripe states before granting a comp
// (`modal-member-tier.js:activeSubscriptions` — the `isActive` helper allow-list).
const CANCELABLE_STATUSES = new Set(['active', 'trialing', 'unpaid', 'past_due']);

interface MemberAddCompModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: Member;
}

const DURATION_OPTIONS: Array<{value: CompExpiryDuration; label: string}> = [
    {value: 'forever', label: 'Forever'},
    {value: 'week', label: '1 Week'},
    {value: 'month', label: '1 Month'},
    {value: 'half-year', label: '6 Months'},
    {value: 'year', label: '1 Year'},
    {value: 'custom', label: 'Custom'}
];

const MemberAddCompModal: React.FC<MemberAddCompModalProps> = ({open, onOpenChange, member}) => {
    const {data: tiersData, isLoading: isLoadingTiers} = useBrowseTiers({
        searchParams: {filter: 'type:paid+active:true', limit: 'all'}
    });
    const availablePaidTiers = tiersData?.tiers ?? [];

    const [selectedTierId, setSelectedTierId] = React.useState<string>('');
    const [duration, setDuration] = React.useState<CompExpiryDuration>('forever');
    const [customDate, setCustomDate] = React.useState<string>('');

    // Reset local state whenever the modal reopens so a previous partial selection
    // never leaks into a fresh flow.
    React.useEffect(() => {
        if (open) {
            setSelectedTierId('');
            setDuration('forever');
            setCustomDate('');
        }
    }, [open]);

    const editSubscription = useEditMemberSubscription();
    const editMember = useEditMember();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // The list of Stripe subscriptions the flow needs to hard-cancel first —
    // narrowed to the exact Ember allow-list so unusual statuses (incomplete,
    // paused, etc.) aren't hard-canceled behind the admin's back.
    const activePaidSubscriptions = (member.subscriptions ?? []).filter(
        (sub: MemberSubscription) => classifyMemberSubscription(sub) === 'paid' && CANCELABLE_STATUSES.has(sub.status)
    );

    // Native <input type="date"> minimum: don't allow picking a past day.
    const todayLocal = moment().format('YYYY-MM-DD');

    const canSubmit = !!selectedTierId && !isSubmitting
        && (duration !== 'custom' || !!customDate);

    const onSubmit = async () => {
        if (!canSubmit) {
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. Cancel every active Stripe subscription immediately — matches Ember
            //    `modal-member-tier.js:128-136`. Sequential so a failure aborts before
            //    the tier is granted.
            for (const sub of activePaidSubscriptions) {
                await editSubscription.mutateAsync({
                    memberId: member.id,
                    subscriptionId: sub.id,
                    status: 'canceled'
                });
            }

            // 2. Grant the comp tier via `useEditMember`. Match Ember exactly:
            //    `tiers: [newTier]` only, no existing tiers alongside. The server
            //    rejects `products.length > 1` — this is safer under data drift
            //    (concurrent tab edit) than preserving surviving tiers here.
            const expiryAt = computeCompExpiryAt(duration, duration === 'custom' ? customDate : null);
            const newTier = expiryAt
                ? {id: selectedTierId, expiry_at: expiryAt}
                : {id: selectedTierId};

            await editMember.mutateAsync({
                id: member.id,
                // `member.email` is optional on the type — omit rather than send
                // an `undefined` in the JSON body if the invariant ever breaks.
                ...(member.email ? {email: member.email} : {}),
                tiers: [newTier]
            });

            toast.success('Complimentary subscription added');
            onOpenChange(false);
        } catch {
            toast.error('Couldn’t add complimentary subscription');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => {
            // Block dismissal while the multi-step flow is running so the user can't
            // orphan a half-canceled state.
            if (isSubmitting) {
                return;
            }
            onOpenChange(next);
        }}>
            <DialogContent data-testid='add-comp-modal'>
                <DialogHeader>
                    <DialogTitle>Add complimentary subscription</DialogTitle>
                    <DialogDescription>
                        Grants this member access to a paid tier for the chosen duration. Any active paid subscription is canceled first.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-1.5'>
                        <Label htmlFor='comp-tier'>Tier</Label>
                        <Select value={selectedTierId} onValueChange={setSelectedTierId}>
                            <SelectTrigger data-testid='comp-tier-select' disabled={isLoadingTiers || isSubmitting} id='comp-tier'>
                                <SelectValue placeholder={isLoadingTiers ? 'Loading tiers…' : 'Select a tier'} />
                            </SelectTrigger>
                            <SelectContent>
                                {availablePaidTiers.map(tier => (
                                    <SelectItem key={tier.id} data-tier-id={tier.id} value={tier.id}>{tier.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='flex flex-col gap-1.5'>
                        <Label htmlFor='comp-duration'>Duration</Label>
                        <Select value={duration} onValueChange={(v) => {
                            if (isCompExpiryDuration(v)) {
                                setDuration(v);
                            }
                        }}>
                            <SelectTrigger data-testid='comp-duration-select' disabled={isSubmitting} id='comp-duration'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DURATION_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {duration === 'custom' && (
                        <div className='flex flex-col gap-1.5'>
                            <Label htmlFor='comp-custom-date'>Expires on</Label>
                            <Input
                                data-testid='comp-custom-date'
                                disabled={isSubmitting}
                                id='comp-custom-date'
                                min={todayLocal}
                                type='date'
                                value={customDate}
                                onChange={e => setCustomDate(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button disabled={isSubmitting} variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button data-testid='comp-add-confirm' disabled={!canSubmit} onClick={() => void onSubmit()}>
                        {isSubmitting ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Adding</span>
                            </>
                        ) : 'Add subscription'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MemberAddCompModal;
