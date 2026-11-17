# Gift Links

Gift Links covers shareable access to individual protected posts and pages without creating a membership.

## Language

**Gift Link**:
A revocable link that grants its holder access to one protected post or page. It does not create or redeem a gift subscription.
_Avoid_: Redemption link, gift-subscription link

## Changes

Each command that changes a post's live link reports one change: `GiftLinkAdded` when a post that had no live link is given one, `GiftLinkReset` when a post's live link is replaced with a new one, and `GiftLinksRemoved` when every post's live link is removed at once. Gift links never adds or deletes a post, so each is an edit of a post, with the post and its live link before and after. The service root records each one in History: an added link and a reset as an action on the post (added, or edited with the name "reset"), with the post's title, and a removal of every link as one deleted action that belongs to no post. Asking for the link of a post that already has one changes nothing and reports nothing, and so does removing every link when no post has one.
