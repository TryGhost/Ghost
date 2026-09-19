import React from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  inputSurface,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// Placeholder email body for the node preview. The proto doesn't render lexical, so
// any email that HAS content shows this stand-in to make the node read as an email.
const EMAIL_BODY_PREVIEW =
  'Hey there,\n\nThanks for joining — here’s what to expect next, straight to your inbox.\n\nOver the next few weeks we’ll share our best tips, stories from the community, and the occasional behind-the-scenes look at what we’re building.\n\nGlad to have you here.';

// What an empty content field says: the field's NAME, parallel to the "Subject"
// addon in the field above it — the card reads as two labelled fields. It was
// "Begin writing your email…" (the editor's own placeholder register) and that
// was the wrong promise: pressing this field opens a fullscreen editor, and an
// invitation to start typing describes an interaction the field doesn't have.
// A noun names the field without promising mechanics; the chrome, hover and
// pen carry "press to edit".
const EMAIL_BODY_EMPTY = 'Message';

interface EmailPreviewProps {
  subject: string;
  // editable (edit canvas): subject is an inline input + the body sheet carries a
  // floating edit-content button. Read (run/read canvas): subject is shown read-only
  // and the body sheet is display-only — same layout, so all states look identical.
  editable?: boolean;
  // Whether anything has been written — see lexicalHasContent. Defaults to true so
  // the read canvas, which shows only published automations and doesn't thread
  // lexical through its node data, keeps reading as an email.
  hasContent?: boolean;
  onSubjectChange?: (subject: string) => void;
  onEditContent?: () => void;
}

// Subject line (with a discreet leading "Subject" label) above an email body excerpt
// sheet. Shared by both canvases so the email node reads the same across edit / read /
// run. Metrics and any run-detail line are appended by the caller.
//
// The one and only email card body. A `bare` variant lived here too — no form
// chrome, the subject as the card's own heading, analytics inline below — for the
// exploration lanes' on-card analytics concept. It went when the card was
// consolidated across every lane: one email node, one body, every lane.
export const EmailPreview: React.FC<EmailPreviewProps> = ({
  subject,
  editable = false,
  hasContent = true,
  onSubjectChange,
  onEditContent,
}) => (
  <div>
    <InputGroup className="mb-3">
      <InputGroupAddon align="inline-start">
        <InputGroupText>Subject</InputGroupText>
      </InputGroupAddon>
      {/* No placeholder — the "Subject" addon is already inside the field, and a
                placeholder beside it said the same thing twice. */}
      <InputGroupInput
        readOnly={!editable}
        value={subject}
        onChange={editable ? (e) => onSubjectChange?.(e.target.value) : undefined}
      />
    </InputGroup>
    {/* The content, as A FIELD THAT OPENS — the same shape the trigger's tiers
            field takes: input chrome (inputSurface), a Pen on the right naming the
            interaction, hover:bg-muted saying it's pressable, and the WHOLE surface
            as the target. This replaced a floating icon button in the sheet's
            corner (SquarePen, with a tooltip): one card offering two different
            grammars for "press to edit this" was one too many, and the corner
            button's target was 36px where the whole excerpt could be.

            Four lines of excerpt, down from six. It only has to say "this is an
            email with writing in it" — six was enough to start READING, which
            isn't this surface's job. */}
    {editable ? (
      <button
        aria-label="Edit email content"
        // px-3 py-2.5, not p-4: the horizontal inset is the input recipe's own
        // (the tiers field and the subject input above both sit on px-3), and
        // the vertical roughly matches what h-9 gives a one-line field — so the
        // two fields read as the same control at different heights, not two
        // boxes with different rules.
        //
        // group/field so the pen reveals on field hover — see the icon below.
        className={cn(
          inputSurface('self'),
          'group/field flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left',
          'transition-colors hover:bg-muted',
        )}
        type="button"
        onClick={() => onEditContent?.()}
      >
        {/* min-h-[4lh]: always four lines tall, full or empty — the height in
                    the text's own line-height units, so the clamp and the minimum
                    can't drift apart. An empty field that collapsed to one line
                    read as a small setting; held at its full height it reads as a
                    text AREA — a place long-form writing is going to go. */}
        <span className="line-clamp-4 min-h-[4lh] text-control whitespace-pre-line text-muted-foreground">
          {hasContent ? EMAIL_BODY_PREVIEW : EMAIL_BODY_EMPTY}
        </span>
        {/* Revealed by hovering the FIELD (or focusing it), the same deal as
                    the header's title pencil: at rest the content is the point, and
                    the pen is the interaction's label, not part of the content. The
                    width stays reserved so nothing shifts. */}
        <LucideIcon.Pen
          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </button>
    ) : (
      // Read canvas: the same sheet, inert — no pen, no hover, nothing to
      // press. Same paddings and held height as the editable field so the card
      // doesn't change size between canvases.
      <div className="rounded-md border border-control-border bg-control-surface px-3 py-2.5">
        <p className="line-clamp-4 min-h-[4lh] text-control whitespace-pre-line text-muted-foreground">
          {hasContent ? EMAIL_BODY_PREVIEW : EMAIL_BODY_EMPTY}
        </p>
      </div>
    )}
  </div>
);
