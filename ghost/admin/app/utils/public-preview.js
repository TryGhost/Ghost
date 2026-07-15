function parseLexical(lexical) {
    if (!lexical) {
        return null;
    }

    if (typeof lexical !== 'string') {
        return lexical;
    }

    try {
        return JSON.parse(lexical);
    } catch (error) {
        return null;
    }
}

function nodeContainsPublicPreview(node) {
    if (!node || typeof node !== 'object') {
        return 0;
    }

    const currentNodeCount = node.type === 'paywall' ? 1 : 0;
    const childNodeCount = Array.isArray(node.children)
        ? node.children.reduce((count, child) => count + nodeContainsPublicPreview(child), 0)
        : 0;

    return currentNodeCount + childNodeCount;
}

function nodeHasContent(node) {
    if (!node || typeof node !== 'object' || node.type === 'paywall') {
        return false;
    }

    if (typeof node.text === 'string' && node.text.trim()) {
        return true;
    }

    if (Array.isArray(node.children) && node.children.some(nodeHasContent)) {
        return true;
    }

    return !['root', 'paragraph', 'heading', 'quote'].includes(node.type);
}

function nodeWordCount(node) {
    if (!node || typeof node !== 'object') {
        return 0;
    }

    const ownWords = typeof node.text === 'string'
        ? node.text.trim().split(/\s+/).filter(Boolean).length
        : 0;
    const childWords = Array.isArray(node.children)
        ? node.children.reduce((count, child) => count + nodeWordCount(child), 0)
        : 0;

    return ownWords + childWords;
}

export const PUBLIC_PREVIEW_SUGGESTION_TARGET_WORDS = 120;
export const PUBLIC_PREVIEW_SUGGESTION_MIN_WORDS = 40;

export function getPublicPreviewSuggestion(lexical, {
    minWords = PUBLIC_PREVIEW_SUGGESTION_MIN_WORDS,
    targetWords = PUBLIC_PREVIEW_SUGGESTION_TARGET_WORDS
} = {}) {
    const parsedLexical = parseLexical(lexical);
    const rootChildren = parsedLexical?.root?.children;

    if (!Array.isArray(rootChildren) || getPublicPreviewStatus(parsedLexical) !== 'none') {
        return null;
    }

    const meaningfulContentIndices = rootChildren
        .map((node, index) => nodeHasContent(node) ? index : null)
        .filter(index => index !== null);
    const lastContentIndex = meaningfulContentIndices[meaningfulContentIndices.length - 1] ?? -1;
    const paragraphCandidates = [];
    let paragraphCount = 0;
    let cumulativeWords = 0;

    rootChildren.forEach((node, index) => {
        if (node?.type !== 'paragraph' || nodeWordCount(node) === 0) {
            return;
        }

        paragraphCount += 1;
        cumulativeWords += nodeWordCount(node);

        if (index < lastContentIndex) {
            paragraphCandidates.push({
                afterIndex: index,
                paragraphCount,
                wordCount: cumulativeWords
            });
        }
    });

    const preferredCandidate = paragraphCandidates.find((candidate) => {
        return candidate.wordCount >= targetWords || candidate.paragraphCount >= 3;
    });
    const fallbackCandidate = paragraphCandidates.find((candidate) => {
        return candidate.wordCount >= minWords;
    });
    const candidate = preferredCandidate || fallbackCandidate;

    if (candidate) {
        return {
            afterIndex: candidate.afterIndex,
            type: 'inline'
        };
    }

    return null;
}

export function getPublicPreviewStatus(lexical) {
    const parsedLexical = parseLexical(lexical);
    const rootChildren = parsedLexical?.root?.children;

    if (!Array.isArray(rootChildren)) {
        return 'none';
    }

    const publicPreviewCount = nodeContainsPublicPreview(parsedLexical.root);

    if (publicPreviewCount === 0) {
        return 'none';
    }

    if (publicPreviewCount > 1) {
        return 'multiple';
    }

    const publicPreviewIndex = rootChildren.findIndex(node => node?.type === 'paywall');

    if (publicPreviewIndex === -1) {
        return 'multiple';
    }

    const hasContentBefore = rootChildren.slice(0, publicPreviewIndex).some(nodeHasContent);
    const hasContentAfter = rootChildren.slice(publicPreviewIndex + 1).some(nodeHasContent);

    if (!hasContentBefore) {
        return 'top';
    }

    if (!hasContentAfter) {
        return 'bottom';
    }

    return 'valid';
}

function recipientSegments(recipientFilter) {
    return (recipientFilter || '')
        .split(',')
        .map(segment => segment.trim())
        .filter(Boolean);
}

export function getPublicPreviewEmailRisk({post, publicPreviewStatus, recipientFilter, willEmail}) {
    if (!willEmail || publicPreviewStatus === 'valid' || !recipientFilter) {
        return null;
    }

    const segments = recipientSegments(recipientFilter);

    if (post.visibility === 'paid') {
        const hasFreeMembers = segments.includes('status:free');
        const hasPotentiallyFreeMembers = segments.some(segment => segment !== 'status:-free' && !segment.startsWith('tier:'));

        if (hasFreeMembers) {
            return 'free-members';
        }

        return hasPotentiallyFreeMembers ? 'recipient-access' : null;
    }

    if (post.visibility === 'tiers') {
        const allowedTierSegments = new Set((post.tiers || []).map(tier => `tier:${tier.slug}`));
        const hasRecipientsOutsidePostTiers = segments.some(segment => !allowedTierSegments.has(segment));

        return hasRecipientsOutsidePostTiers ? 'recipient-access' : null;
    }

    return null;
}

export function getPublicPreviewPaywallRecipientFilter({post, publicPreviewStatus, fullRecipientFilter, willEmail}) {
    if (!willEmail || publicPreviewStatus !== 'valid' || !fullRecipientFilter) {
        return null;
    }

    if (post.visibility === 'paid') {
        return `${fullRecipientFilter}+(status:free)`;
    }

    if (post.visibility === 'tiers') {
        const tiersWithoutAccess = (post.tiers || [])
            .map(tier => `product:-'${tier.slug}'`)
            .join('+');

        if (tiersWithoutAccess) {
            return `${fullRecipientFilter}+(${tiersWithoutAccess})`;
        }
    }

    return null;
}
