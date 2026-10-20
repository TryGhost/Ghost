import { Stack, Text } from '@tryghost/shade/primitives';
import type { emailsWithTk } from '@/automations/utils/email-tk';

export function EmailTkWarning({ emails }: { emails: ReturnType<typeof emailsWithTk> }) {
  if (!emails.length) {
    return null;
  }
  return (
    <Stack className="rounded-md bg-muted p-4" gap="sm">
      <Text weight="medium">Unresolved TK reminders</Text>
      <Text size="sm">
        These emails still contain TK placeholders. You can return to editing or publish them as
        they are.
      </Text>
      <ul
        aria-label="Emails with TK reminders"
        className="max-h-40 list-inside list-disc overflow-y-auto text-sm"
      >
        {emails.map((email) => (
          <li key={email.id} className="break-words">
            {email.subject}
          </li>
        ))}
      </ul>
    </Stack>
  );
}
