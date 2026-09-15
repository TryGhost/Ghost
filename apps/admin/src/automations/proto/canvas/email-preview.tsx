import React from 'react';
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// Placeholder email body for the node preview. The proto doesn't render lexical, so
// any email that HAS content shows this stand-in to make the node read as an email.
const EMAIL_BODY_PREVIEW =
  'Hey there,\n\nThanks for joining — here’s what to expect next, straight to your inbox.\n\nOver the next few weeks we’ll share our best tips, stories from the community, and the occasional behind-the-scenes look at what we’re building.\n\nGlad to have you here.';

// What an email with nothing written yet says where its body would be. The editor's
// own placeholder register ("Begin writing your post…"), so an empty email reads as
// one waiting to be written rather than one that failed to load.
const EMAIL_BODY_EMPTY = 'Begin writing your email…';

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
    {/* Preview surface matches the subject input's chrome (border, fill, radius);
            body text matches the "Subject" label size/colour. When editable, edit-content
            floats top-right, inset to the sheet's p-4 padding. */}
    <div className="relative rounded-md border border-control-border bg-control-surface p-4">
      <p
        className={cn(
          'line-clamp-6 text-control whitespace-pre-line text-muted-foreground',
          editable && 'pr-9',
        )}
      >
        {hasContent ? EMAIL_BODY_PREVIEW : EMAIL_BODY_EMPTY}
      </p>
      {editable && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Edit email content"
                className="absolute top-[8px] right-[8px]"
                size="icon"
                variant="ghost"
                onClick={() => onEditContent?.()}
              >
                <LucideIcon.SquarePen />
              </Button>
            </TooltipTrigger>
            {/* This preview sits inside a node card, so the canvas can
                            pan out from under an open tooltip. See the OptionPicker
                            for why floating content needs "always" here. */}
            <TooltipContent updatePositionStrategy="always">Edit email content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  </div>
);
