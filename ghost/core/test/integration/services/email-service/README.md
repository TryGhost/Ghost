# What is a golden post?
The golden post is a single lexical post that has at least one example of every card that is available in the Koenig editor (with a few exceptions for cards that should never make it into an email). We have run into problems in the past where a small change to a particular card or to the EmailRenderer itself results in seriously mangled email rendering in one or more clients (usually Outlook).

# How do I update the golden post to include a new card?
If you're seeing a failing test like `The golden post does not contain the ${card} card`, that means that you (or someone else) has added a new node to `@tryghost/kg-default-nodes` that is not currently represented in the golden post. This test is here to trigger a review of the rendered email of the new card, to make sure it doesn't break the formatting in email clients. To update this test properly, please do the following:

1. Create a card in the lexical editor, either at `koenig.ghost.org` or in your local Koenig repo
2. Use the JSON Output in the bottom right of the demo to copy the lexical payload for the new card
3. Paste the lexical payload for the card as a top level child of the `root` node in the golden post fixture at `ghost/core/test/utils/fixtures/email-service/golden-post.json`
4. Re-run your tests with `UPDATE_SNAPSHOT=1` set to update the snapshot to include the new card
5. Update (or recreate) the Golden Post on `main.ghost.org` using the `golden-post.json` string.
6. Send a test email to Litmus and examine the rendered output to ensure everything looks right on different clients.