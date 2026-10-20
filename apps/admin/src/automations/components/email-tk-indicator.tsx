import type { EmailTkInspection } from '@/automations/utils/email-tk';

export function EmailTkIndicator({ inspection }: { inspection: EmailTkInspection }) {
  if (!inspection.subject && !inspection.body) {
    return null;
  }
  const fields = [];
  if (inspection.subject) {
    fields.push('subject');
  }
  if (inspection.body) {
    fields.push('body');
  }
  const explanation = `Unresolved TK reminders in the ${fields.join(' and ')} of this email.`;
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
