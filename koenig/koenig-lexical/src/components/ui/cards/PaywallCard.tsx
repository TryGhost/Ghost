import KoenigComposerContext from '../../../context/KoenigComposerContext';
import {useContext} from 'react';
import type {PostVisibility} from '../../../context/KoenigComposerContext';

const RESTRICTED_ACCESS_LABELS: Record<Exclude<PostVisibility, 'public'>, string> = {
    members: 'Members only',
    paid: 'Paid members only',
    tiers: 'Selected tiers only'
};

export function PaywallCard() {
    const {cardConfig} = useContext(KoenigComposerContext);
    const paywallImprovements = cardConfig?.feature?.paywallImprovements;
    const postVisibility = cardConfig?.post?.visibility;

    if (paywallImprovements && postVisibility === 'public') {
        return (
            <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase before:mr-2 before:flex-1 before:border-t before:border-yellow before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-yellow after:content-['']">
                <span className="text-yellow">Public preview · No effect while post is public</span>
            </div>
        );
    }

    // hosts without a post in their config (email editor, demo) keep the generic label
    const accessLabel = paywallImprovements && postVisibility && postVisibility !== 'public'
        ? RESTRICTED_ACCESS_LABELS[postVisibility]
        : 'Only visible to members';

    return (
        <div className="flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-grey-300 dark:text-grey-800">
            Free public preview
            <span className="mx-2 text-green">↑</span>
            /
            <span className="mx-2 text-green">↓</span>
            {accessLabel}
        </div>
    );
}
