import {$createParagraphNode, $getRoot} from 'lexical';
import {$createPaywallV2Node, $isPaywallV2Node} from '../nodes/PaywallV2Node';

/**
 * Drops a free preview in at the very top of the post.
 *
 * The top, because the gate starts closed: the author opens it by dragging the
 * card down past whatever they want to give away, which is a deliberate act on
 * content they can see rather than a guess made on their behalf about how much
 * of a post they haven't written yet is free.
 *
 * The card reports the post's access rather than setting it, so it's seeded
 * with whatever the post already says. A post with no gate has nothing to
 * preview past, but the card still needs an access to name, and members-only is
 * what the renderer falls back to.
 *
 * @returns the inserted card, or null when the post already has one - a post
 * can only hold a single paywall
 */
export function $insertPaywallCardAtTop(post) {
    const root = $getRoot();

    if (root.getChildren().some($isPaywallV2Node)) {
        return null;
    }

    const visibility = post?.visibility;
    const access = !visibility || visibility === 'public' ? 'members' : visibility;
    const cardNode = $createPaywallV2Node({
        access,
        tiers: access === 'tiers' ? [...(post?.tiers || [])] : []
    });

    const [firstChild] = root.getChildren();

    if (firstChild) {
        firstChild.insertBefore(cardNode);
    } else {
        root.append(cardNode);
    }

    // a card can't be the last thing in the document or there's nowhere left to
    // write the gated half
    if (root.getLastChild() === cardNode) {
        root.append($createParagraphNode());
    }

    return cardNode;
}
