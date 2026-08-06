const PUBLIC_ACCESS = 'public-access';
const NO_CONTENT_BEFORE = 'no-content-before';
const NO_CONTENT_AFTER = 'no-content-after';

function parseLexicalState(lexical) {
    if (!lexical) {
        return null;
    }

    try {
        return typeof lexical === 'string' ? JSON.parse(lexical) : lexical;
    } catch {
        return null;
    }
}

function lexicalNodeHasContent(node) {
    if (!node || node.type === 'paywall' || node.type === 'linebreak') {
        return false;
    }

    if (typeof node.text === 'string') {
        return !!node.text.trim();
    }

    if (node.type === 'text' || node.type === 'extended-text') {
        return false;
    }

    if (Array.isArray(node.children)) {
        return node.children.some(lexicalNodeHasContent);
    }

    return node.type !== 'paragraph' && node.type !== 'root';
}

export function hasPublicPreview(post) {
    const state = parseLexicalState(post.lexicalScratch || post.lexical);
    const children = state?.root?.children;

    if (!Array.isArray(children)) {
        return false;
    }

    return children.some(node => node?.type === 'paywall');
}

// which non-access groups get the preview by email, read from the paywall
// node: 'all' (everyone without access), '' (nobody), or a CSV of member
// segments like 'status:free,tier:bronze'. Falls back to the legacy
// post-level toggle for posts whose divider predates the node property.
export function getPreviewEmailSegments(post) {
    const state = parseLexicalState(post.lexicalScratch || post.lexical);
    const children = state?.root?.children;
    const paywall = Array.isArray(children) ? children.find(node => node?.type === 'paywall') : null;

    if (!paywall) {
        return '';
    }

    if (paywall.previewEmailTo === undefined) {
        return (post.emailPublicPreview ?? true) ? 'all' : '';
    }

    return paywall.previewEmailTo;
}

export function getPublicPreviewWarning(post) {
    const state = parseLexicalState(post.lexicalScratch || post.lexical);
    const children = state?.root?.children;

    if (!Array.isArray(children)) {
        return null;
    }

    const publicPreviewIndex = children.findIndex(node => node?.type === 'paywall');

    if (publicPreviewIndex === -1) {
        return null;
    }

    if (post.visibility === 'public') {
        return PUBLIC_ACCESS;
    }

    if (!children.slice(0, publicPreviewIndex).some(lexicalNodeHasContent)) {
        return NO_CONTENT_BEFORE;
    }

    if (!children.slice(publicPreviewIndex + 1).some(lexicalNodeHasContent)) {
        return NO_CONTENT_AFTER;
    }

    return null;
}
