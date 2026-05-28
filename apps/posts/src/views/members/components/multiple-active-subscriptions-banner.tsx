import {Banner, Button} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
import {useMultipleActiveSubscriptionsBanner} from '../hooks/use-multiple-active-subscriptions-banner';

interface MultipleActiveSubscriptionsBannerProps {
    nql?: string;
    search: string;
}

const MultipleActiveSubscriptionsBanner = ({
    nql,
    search
}: MultipleActiveSubscriptionsBannerProps) => {
    const banner = useMultipleActiveSubscriptionsBanner({
        nql,
        search
    });

    if (!banner.shouldShow) {
        return null;
    }

    return (
        <Banner
            role="status"
            variant="warning"
            {...(banner.canDismiss ? {
                dismissible: true as const,
                onDismiss: banner.handleDismiss
            } : {
                dismissible: false as const
            })}
        >
            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium">
                    We found {formatNumber(banner.count)} {banner.count === 1 ? 'member' : 'members'} with more than one active paid subscription.{' '}
                    <a className="font-semibold underline" href="https://ghost.org/help/duplicate-subscription-warning/" rel="noopener noreferrer" target="_blank">Learn more</a>
                </div>
                {banner.canDismiss && (
                    <Button size="sm" variant="outline" onClick={banner.handleViewMembers}>
                        View members
                    </Button>
                )}
            </div>
        </Banner>
    );
};

export default MultipleActiveSubscriptionsBanner;
