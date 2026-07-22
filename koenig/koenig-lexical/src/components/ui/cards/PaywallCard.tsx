import PropTypes from 'prop-types';

const RESTRICTED_ACCESS_LABELS = {
    members: 'Members only',
    paid: 'Paid members only',
    tiers: 'Selected tiers only'
};

export function PaywallCard({access = 'members'}) {
    if (access === 'public') {
        return (
            <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase before:mr-2 before:flex-1 before:border-t before:border-yellow before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-yellow" data-post-access={access} data-testid="paywall-card">
                <span className="text-yellow">Public preview · No effect while post is public</span>
            </div>
        );
    }

    return (
        <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-grey-300 dark:text-grey-800" data-post-access={access} data-testid="paywall-card">
            Free public preview
            <span className="mx-2 text-green">↑</span>
            /
            <span className="mx-2 text-green">↓</span>
            {RESTRICTED_ACCESS_LABELS[access] || RESTRICTED_ACCESS_LABELS.members}
        </div>
    );
}

PaywallCard.propTypes = {
    access: PropTypes.oneOf(['public', 'members', 'paid', 'tiers'])
};
