import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$createParagraphNode, $getRoot, COMMAND_PRIORITY_LOW} from 'lexical';
import {$createPaywallV2Node, $isPaywallV2Node, INSERT_PAYWALL_V2_COMMAND, PaywallV2Node} from '../nodes/PaywallV2Node';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

/**
 * What a card inserted right now should say, and whether putting it there gates
 * the post.
 *
 * On a gated post the card reports the access the author already set - it never
 * asks a question they've answered. On a public one there's no answer yet, and
 * reaching for a paywall is the author saying they want part of the post gated,
 * so the post is gated to match. Paid where there's a Stripe account to charge
 * through, members-only where there isn't: offering a paid gate to a publisher
 * who can't take payment would be a wall with no door in it.
 */
function resolveAccess({visibility, postTiers, stripeEnabled}) {
    if (!visibility || visibility === 'public') {
        return {access: stripeEnabled ? 'paid' : 'members', tiers: [], gatesPost: true};
    }

    return {
        access: visibility,
        tiers: visibility === 'tiers' ? [...(postTiers || [])] : [],
        gatesPost: false
    };
}

/**
 * Takes the paywall out when the post goes public.
 *
 * A paywall in a public post gates nothing, so leaving it there would be a card
 * claiming to split the post while every reader sees all of it. Nothing else
 * about the post changes: the writing either side of the card stays where it is
 * and simply runs together, which is what "public" means.
 *
 * @returns whether there was anything to take out
 */
function $removePaywallForUngating() {
    const root = $getRoot();
    const cardNodes = root.getChildren().filter($isPaywallV2Node);

    if (!cardNodes.length) {
        return false;
    }

    cardNodes.forEach(node => node.remove());

    // Lexical won't hold an empty root, and a post whose only content was the
    // card now has nothing left in it
    if (!root.getChildrenSize()) {
        root.append($createParagraphNode());
    }

    return true;
}

/**
 * The paywall card's insertion, and the one place access still follows it.
 *
 * Gating a post does not put a paywall in it - that's the author's own move,
 * from the card menu or the "Add free preview" action beside the access chip.
 * The link runs the other way, and only at the public boundary: a paywall can't
 * exist in a public post, so inserting one gates the post and going public
 * takes one out.
 */
export const PaywallV2Plugin = () => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);

    const visibility = cardConfig?.post?.visibility;

    // read through refs: the host rebuilds `post` on every render, so as effect
    // dependencies these would re-register the command continuously
    const visibilityRef = React.useRef(visibility);
    visibilityRef.current = visibility;

    const postTiersRef = React.useRef(cardConfig?.post?.tiers);
    postTiersRef.current = cardConfig?.post?.tiers;

    const stripeEnabledRef = React.useRef(cardConfig?.stripeEnabled);
    stripeEnabledRef.current = cardConfig?.stripeEnabled;

    const cardConfigRef = React.useRef(cardConfig);
    cardConfigRef.current = cardConfig;

    React.useEffect(() => {
        if (!editor.hasNodes([PaywallV2Node])) {
            console.error('PaywallV2Plugin: PaywallV2Node not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_PAYWALL_V2_COMMAND,
                async (dataset) => {
                    const {access, tiers, gatesPost} = resolveAccess({
                        visibility: visibilityRef.current,
                        postTiers: postTiersRef.current,
                        stripeEnabled: stripeEnabledRef.current
                    });

                    const cardNode = $createPaywallV2Node({access, tiers, ...dataset});
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    // No loop with the removal below: this only ever moves the
                    // post away from public, which isn't a transition that
                    // removes anything.
                    if (gatesPost) {
                        cardConfigRef.current?.setPostVisibility?.(access);
                        cardConfigRef.current?.onPostGated?.(access);
                    }

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    /**
     * Only on the transition, never on load: a public post saved with a paywall
     * in it is a state the author can still see and fix, and tearing content out
     * of every post on open would be worse than leaving it there.
     * `previousVisibility` starts at the current value precisely so mounting
     * isn't mistaken for a change.
     */
    const previousVisibilityRef = React.useRef(visibility);

    React.useEffect(() => {
        const previous = previousVisibilityRef.current;
        previousVisibilityRef.current = visibility;

        const wasGated = !!previous && previous !== 'public';
        const isPublic = !visibility || visibility === 'public';

        if (!wasGated || !isPublic) {
            return;
        }

        let removed = false;

        editor.update(() => {
            removed = $removePaywallForUngating();
        });

        // outside the update: the host's notification re-renders Ember, and
        // there's nothing left to say if the post had no paywall to begin with
        if (removed) {
            cardConfigRef.current?.onPaywallRemoved?.();
        }
    }, [editor, visibility]);

    return null;
};

export default PaywallV2Plugin;
