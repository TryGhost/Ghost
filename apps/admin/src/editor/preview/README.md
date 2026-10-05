# Post preview

`<PostPreviewModal>` shows a post as its readers will get it: rendered by the site (Web) or rendered as the newsletter it would be sent as (Email). It is self-contained — the caller supplies the post's identity and preview URL, and the modal reads everything else (settings, tiers, newsletters, the current user, the email preview) from the Admin API.

| Prop              | Meaning                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `open`            | Whether the modal is shown; `onOpenChange` reports closing                                   |
| `postId`          | Identifies the post for the email preview and test-send endpoints                            |
| `previewUrl`      | The post's public preview URL; empty until the post has a uuid                               |
| `isPost`          | Pages have no email preview                                                                  |
| `newsletterSlug`  | The post's own newsletter, preselected in the email preview                                  |
| `subjectEditor`   | The session's subject field: value, title fallback, save state, and stage and commit         |
| `onBeforeOpen`    | Awaited before the preview renders, so the caller can save the draft it previews             |
| `onPublish`       | Renders a Publish button; supplied for every user who can publish                            |
| `publishDisabled` | Keeps the Publish button rendered but disabled while the caller cannot open its publish flow |

The modal stages and commits subject edits through the optional `subjectEditor` port to the editor session. `onBeforeOpen` exists because a draft must be persisted before the site or the email renderer can see the latest content; what that means — dirty checks, a save in flight — belongs to the caller.

## Layout and controls

View controls are centered in the header when space allows and shift toward the title
as the screen narrows. Device controls hide below 800px. Below 640px, the title and audience selectors
are hidden so format tabs and actions stay on one row. Format and device controls use pill groups; audience
and tier selectors use the ghost header treatment. The icon-only Share menu keeps
copying the audience-specific preview link and opening it in a new tab together,
and stays disabled until the post has been saved successfully.

Desktop Web previews fill the space below the header without gutters or device
chrome. Desktop Email previews are centered at a maximum width of 720px on a
muted canvas, with the sidebar's corner radius and the mobile frame's shadow.
Mobile previews retain their phone frame on the same muted canvas in either format.

Escape closes the modal. Keys pressed inside a preview frame never reach the admin document, so the Web frame's window is listened to on every page it loads; that works only when the site shares the admin's origin. The sandboxed Email frame cannot be observed, so an Escape pressed inside it is not heard.

## Audience

One audience drives both formats, held as a segment plus an optional tier slug and translated by `preview-url.ts`:

| Segment     | Web query                               | Email params                            |
| ----------- | --------------------------------------- | --------------------------------------- |
| `anonymous` | `member_status=anonymous`               | not offered — email has no visitor      |
| `free`      | `member_status=free`                    | `member_status=free`                    |
| `paid`      | `member_status=paid`                    | `member_status=paid`                    |
| `tier`      | `member_status=paid&member_tier=<slug>` | `member_status=paid&member_tier=<slug>` |

The paid audiences appear only when paid members are enabled, and the tier audience only when the site has paid tiers and the user is not a contributor, who cannot read tiers. The default is a free member.

## Email

The Email tab is offered for posts only, when members are on, newsletters are not disabled in the editor settings, and the user is not a contributor.

The rendered email arrives as a complete HTML document and is shown in a `srcdoc` iframe sandboxed without `allow-scripts` and without `allow-same-origin`, so it can neither run its own scripts nor reach the admin page. Scrollbar styling is concatenated into that document because the admin stylesheet does not apply inside it.

The newsletters offered are the site's active ones, read from the same full browse the publish flow reads and narrowed here, every page of it. The post's own newsletter stays selectable even once it has been archived, which is looked up by slug; a newsletter the site has deleted leaves the email unsendable.

Each newsletter is shown with the address its email goes out from: its sender address, or the site's default address when it has none. When the host manages the site's email, the default address also replaces a sender that is not on the host's sending domain, or any sender when there is no sending domain.

Switching newsletters re-renders the preview against that newsletter, and the test send goes to exactly one address — the current user's, unless it is edited — for the audience currently selected.

A test send that finds the session expired opens the editor's sign-in dialog over the preview and goes out once the writer has signed in. Abandoning the sign-in says beneath Send that the session expired, and sending again asks again.

When the caller passes the saved post, a banner above the rendered email gives its size once the email is estimated at 100kB or more. The estimate is the editor's, described in [the editor README](../README.md#email-size), so it does not follow the newsletter or audience picked here.

The sender and subject controls share a label column and a local 28px height;
the subject input keeps its visible outline. The subject is the post's `email_subject`
settings field. On desktop the input holds the custom subject, or the post title while
there is none, with the title cut to 40 characters as its placeholder. Edits are staged
in the session as they are typed and committed on blur or Enter, like any settings field.
A cleared subject is stored as no subject, so the email goes out under the title again.
A subject over 300 characters is not committed and says so beside the field, where a
failed save is also reported until the subject is edited; a collision or a deleted post
stays reported, because no later save can get past it. Test sending stays disabled
while edits are unsaved or a save is pending. The mobile frame shows the subject, or the
title, as text. Closing preview preserves unsaved subject edits. If those edits prevent
saving when preview reopens, the save-failure screen keeps the subject field available
for correction, and committing the corrected subject retries preparation, whose save
carries it, before displaying the preview or enabling sharing and test sends. That
screen's failed save is the preview's own, so it is shown beside the field without
marking the subject invalid, which only its own length or failed save does.

## Not here yet

Known gaps, listed so they are not mistaken for decisions: an already-sent post is re-rendered by the preview endpoint rather than showing its stored email.
