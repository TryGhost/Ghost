import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { useFocusContext } from '@tryghost/shade/app';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  editorEmailSizeDetails,
  editorEmailSizeWarning,
} from '@tryghost/test-data/selectors/editor';
import type { PublishFlowPost } from './publish/flow-post';
import { useEmailSize } from './use-email-size';

/** The footer's flag for a post whose newsletter would be long enough to be clipped; a click or tap opens the details. */
export function EmailSizeWarning({ post }: { post: PublishFlowPost }) {
  const { isAdmin7 } = useFocusContext();
  const emailSize = useEmailSize(post);

  if (!emailSize?.overLimit) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Looks like this is a long post: ${emailSize.sizeKb}kB`}
          className="bg-background/80 text-state-warning backdrop-blur-sm hover:text-state-warning"
          data-testid={editorEmailSizeWarning}
          shape="pill"
          size={isAdmin7 ? 'icon' : 'icon-sm'}
          type="button"
          variant="ghost"
        >
          <LucideIcon.MailWarning />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72" data-testid={editorEmailSizeDetails} side="top">
        <Stack gap="xs">
          <Text size="sm" weight="semibold">
            Looks like this is a long post
          </Text>
          <Text size="sm" tone="secondary">
            Emails may get clipped in the inbox behind a &quot;View entire message&quot; link when
            they&apos;re over 100kB.
          </Text>
          <Text size="sm">
            You&apos;ve used:{' '}
            <span className="font-semibold text-state-warning">{emailSize.sizeKb}kB</span>
          </Text>
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
