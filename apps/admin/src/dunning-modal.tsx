import {useState} from 'react';
import {X} from 'lucide-react';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {decideDunningIntervention} from '@tryghost/admin-x-framework/utils/dunning-intervention';
import {isOwnerUser} from '@tryghost/admin-x-framework/api/users';
import type {UserRoleType} from '@tryghost/admin-x-framework/api/roles';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
import {useSubscriptionStatus} from './ember-bridge';
import {navigateTo} from './utils/navigation';

interface DunningModalProps {
    currentUser: {
        roles: Array<{name: UserRoleType}>;
    };
}

function getTitle(copyVariant: 'owner-counted' | 'owner-generic' | 'staff', paymentAttempts: number | null): string {
    if (copyVariant === 'staff') {
        return 'This site’s billing needs attention';
    }

    if (copyVariant === 'owner-counted' && paymentAttempts !== null) {
        const attemptLabel = paymentAttempts === 1 ? 'time' : 'times';
        return `Your payment has failed ${formatNumber(paymentAttempts)} ${attemptLabel}`;
    }

    return 'Your payment has failed';
}

export function DunningModal({currentUser}: DunningModalProps) {
    const {data: configData} = useBrowseConfig();
    const subscriptionState = useSubscriptionStatus();
    const [dismissed, setDismissed] = useState(false);
    const audience = isOwnerUser(currentUser) ? 'owner' : 'staff';
    const decision = decideDunningIntervention({
        subscriptionStatus: subscriptionState?.subscription?.status,
        paymentAttempts: subscriptionState?.subscription?.paymentAttempts,
        forceUpgrade: subscriptionState?.subscription?.forceUpgrade === true,
        audience,
        modalDismissed: dismissed
    });

    const billingEnabled = configData?.config.hostSettings?.billing?.enabled === true;

    if (!billingEnabled || !decision.copyVariant) {
        return null;
    }

    const title = getTitle(decision.copyVariant, decision.visiblePaymentAttempts);
    const description = decision.copyVariant === 'staff'
        ? 'Ask the site owner to update the payment details to avoid the subscription being canceled. The site is still online.'
        : 'Update your payment details to avoid your subscription being canceled. Your site is still online.';

    const dismiss = () => setDismissed(true);
    const openBilling = () => {
        dismiss();
        navigateTo('/pro');
    };

    return (
        <Dialog open={decision.reminderModalVisible} onOpenChange={(open) => {
            if (!open) {
                dismiss();
            }
        }}>
            <DialogContent className='relative' onPointerDownOutside={event => event.preventDefault()}>
                <Button
                    aria-label='Close'
                    className='absolute top-3 right-3 text-muted-foreground hover:text-foreground'
                    size='icon'
                    type='button'
                    variant='ghost'
                    onClick={dismiss}
                >
                    <X />
                </Button>
                <DialogHeader className='pr-8'>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type='button' variant='outline' onClick={dismiss}>Dismiss for now</Button>
                    {decision.showBillingAction && (
                        <Button type='button' onClick={openBilling}>Update payment details</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
