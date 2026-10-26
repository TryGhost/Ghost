import type React from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

/*
 * The question box. Beside it, the chip for the page the question is asked
 * from: removing it asks without the page (suggestions and search stop
 * favoring it) until the user moves to another page.
 */

interface HelpComposerProps {
  textareaRef: React.Ref<HTMLTextAreaElement>;
  page: string;
  withPage: boolean;
  /** Takes the page out of the question's context, or puts it back */
  onTogglePage: () => void;
  /** Questions wait until the current answer is in */
  busy: boolean;
  followUp: boolean;
  onSubmit: (text: string) => void;
  /** What's typed, owned by the panel, which also matches articles to it as the user types */
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Gets each key first, for the number shortcuts and moving through the
   * matches as the user types; returns true when it handled the key
   */
  onKeyCommand: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Makes the box a combobox for the matches as the user types (use-help-typeahead.ts) */
  comboboxProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export function HelpComposer({
  textareaRef,
  page,
  withPage,
  onTogglePage,
  busy,
  followUp,
  onSubmit,
  value,
  onValueChange,
  onKeyCommand,
  comboboxProps,
}: HelpComposerProps) {
  const canSend = value.trim().length > 0 && !busy;

  const submit = () => {
    if (canSend) {
      onSubmit(value.trim());
      onValueChange('');
    }
  };

  return (
    <form
      className="shrink-0 border-t border-border-default p-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <InputGroup variant="ghost">
        <InputGroupAddon align="inline-start">
          <LucideIcon.ChevronRight className="text-text-tertiary" />
        </InputGroupAddon>
        <InputGroupTextarea
          ref={textareaRef}
          {...comboboxProps}
          aria-label="Your question"
          // Sized to its content, its narrowest is its placeholder's width,
          // which would push the buttons beside it out of the panel
          className="[field-sizing:content] max-h-36 min-h-0 min-w-0 py-2.5 pl-1"
          placeholder={followUp ? 'Ask a follow-up…' : 'Ask a question…'}
          rows={1}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            // Safari sends the Enter that confirms an IME conversion with
            // keyCode 229 and isComposing false
            if (event.nativeEvent.isComposing || event.keyCode === 229 || onKeyCommand(event)) {
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <InputGroupAddon align="inline-end" className="shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              {withPage ? (
                <InputGroupButton
                  aria-label={`Stop using ${page} as context`}
                  className="group/page"
                  variant="secondary"
                  onClick={onTogglePage}
                >
                  <LucideIcon.Focus className="group-hover/page:hidden" />
                  <LucideIcon.X className="hidden group-hover/page:block" />
                  {/* Keyed so the new page fades in as the user moves around */}
                  <span
                    key={page}
                    className="max-w-28 truncate motion-safe:animate-in motion-safe:fade-in"
                  >
                    {page}
                  </span>
                </InputGroupButton>
              ) : (
                <InputGroupButton
                  aria-label={`Use ${page} as context`}
                  size="icon-xs"
                  onClick={onTogglePage}
                >
                  <LucideIcon.Focus />
                </InputGroupButton>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {withPage ? 'Answers favor this page. Click to remove it.' : `Use ${page} as context`}
            </TooltipContent>
          </Tooltip>
          <InputGroupButton
            aria-label="Ask"
            disabled={!canSend}
            size="icon-xs"
            type="submit"
            variant={canSend ? 'default' : 'ghost'}
          >
            <LucideIcon.ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
