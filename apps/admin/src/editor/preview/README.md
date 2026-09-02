# Post preview

`<PostPreviewModal>` shows a post as its readers will get it: rendered by the site (Web) or rendered as the newsletter it would be sent as (Email). It is self-contained — the caller supplies the post's identity and preview URL, and the modal reads everything else (settings, tiers, newsletters, the current user, the email preview) from the Admin API.

| Prop             | Meaning                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `open`           | Whether the modal is shown; `onOpenChange` reports closing                       |
| `postId`         | Identifies the post for the email preview and test-send endpoints                |
| `previewUrl`     | The post's public preview URL; empty until the post has a uuid                   |
| `isPost`         | Pages have no email preview                                                      |
| `newsletterSlug` | The post's own newsletter, preselected in the email preview                      |
| `onBeforeOpen`   | Awaited before the preview renders, so the caller can save the draft it previews |

The modal never writes to the post. `onBeforeOpen` exists because a draft must be persisted before the site or the email renderer can see the latest content; what that means — dirty checks, a save in flight — belongs to the caller.

## Audience

One audience drives both formats, held as a segment plus an optional tier slug and translated by `preview-url.ts`:

| Segment     | Web query                               | Email params                            |
| ----------- | --------------------------------------- | --------------------------------------- |
| `anonymous` | `member_status=anonymous`               | not offered — email has no visitor      |
| `free`      | `member_status=free`                    | `member_status=free`                    |
| `paid`      | `member_status=paid`                    | `member_status=paid`                    |
| `tier`      | `member_status=paid&member_tier=<slug>` | `member_status=paid&member_tier=<slug>` |

The paid audiences appear only when paid members are enabled, and the tier audience only when the site has paid tiers. The default is a free member.

## Email

The Email tab is offered for posts only, when members are on, newsletters are not disabled in the editor settings, and the user is not a contributor.

The rendered email arrives as a complete HTML document and is shown in a `srcdoc` iframe sandboxed without `allow-scripts` and without `allow-same-origin`, so it can neither run its own scripts nor reach the admin page. Scrollbar styling is concatenated into that document because the admin stylesheet does not apply inside it.

Switching newsletters re-renders the preview against that newsletter, and the test send goes to exactly one address — the current user's, unless it is edited — for the audience currently selected.

## Not here yet

Known gaps, listed so they are not mistaken for decisions: the email subject is read-only (editing it would write to the post), there is no over-100kB "may get clipped" warning, an Escape pressed inside the site preview frame does not close the modal, an already-sent post is re-rendered by the preview endpoint rather than showing its stored email, and the sender address does not apply the managed-email override.
