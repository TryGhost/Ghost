// Pure helpers for the media library picker interceptor, split out so they can
// be unit-tested without the instance-initializer's runtime imports.

// Recognise the hidden file inputs used to add media in the post editor: the
// Koenig media cards and the post feature image both live inside
// .gh-koenig-editor. We deliberately scope to that wrapper rather than matching
// on accept type, so other image inputs elsewhere in admin (tag images, the
// settings logo/icon, theme-zip and CSV/JSON imports) keep their native dialog.
// Those surfaces are not part of the post content the library inventories, and
// their uploads do not go through the editor's reuse hook, so intercepting them
// would both show an incomplete library and re-upload duplicates.
export function getMediaInput(target) {
    if (!target || target.tagName !== 'INPUT' || target.type !== 'file') {
        return null;
    }
    return target.closest('.gh-koenig-editor') ? target : null;
}

// The card's media type, so the picker can lock to it (image/video/audio) and
// label its upload button. The file card has no media-type accept and takes any
// file, so it maps to 'file' (the picker leaves it unlocked - browse everything).
export function cardKindFor(input) {
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    if (accept.includes('image/')) {
        return 'image';
    }
    if (accept.includes('video/')) {
        return 'video';
    }
    if (accept.includes('audio/')) {
        return 'audio';
    }
    return 'file';
}
