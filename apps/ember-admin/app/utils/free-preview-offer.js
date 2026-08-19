/**
 * Whether a post is in a state where offering a free preview means anything.
 *
 * Shared rather than repeated because three placements now ask it - the chip on
 * the canvas, the chip in the header, and the hint under the sidebar input -
 * and an offer that appeared in one place but not another would read as a bug
 * in whichever one the author happened to be looking at.
 *
 * @param {object} post
 * @param {string} visibility - the post's visibility, already resolved against
 *   the site default (an unset visibility takes it, which is what the server
 *   applies on publish)
 */
export function canOfferFreePreview(post, visibility) {
    // A free preview only means something on a gated post - in a public one it
    // splits nothing, because there's nothing on the other side of it. And a
    // post can only hold one, so the offer goes as soon as it's taken up.
    return visibility !== 'public' && !post?.hasPaywallCard;
}
