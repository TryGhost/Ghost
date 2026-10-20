import type { EmailTkInspection } from '@/automations/utils/email-tk';

export function EmailTkIndicator({ inspection }: { inspection: EmailTkInspection }) {
  if (!inspection.subject && !inspection.body) {
    return null;
  }
  const explanation =
    inspection.subject && inspection.body
      ? 'Unresolved TK reminders in the subject and body of this email.'
      : inspection.subject
        ? 'Unresolved TK reminders in the subject of this email.'
        : 'Unresolved TK reminders in the body of this email.';
  return (
    <span
      aria-label={explanation}
      className="shrink-0 rounded-sm bg-state-warning px-1.5 py-0.5 text-2xs font-bold text-state-warning-foreground"
      role="img"
      title={explanation}
    >
      TK
    </span>
  );
}
