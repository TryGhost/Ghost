import { FieldGroup, FieldLegend, FieldSet } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  /**
   * Tighter rows for long lists of switches: horizontal rows are 28px tall and 8px apart,
   * instead of a control-height tall and 12px apart.
   */
  compact?: boolean;
}

// A section of form rows, optionally titled, that share one vertical rhythm.
// Horizontal fields are a control-height tall, and stacked fields sit 8px lower
// so their labels line up with horizontal ones. The row rules target Shade fields
// only, as other elements can carry data-orientation too. Sections are 32px apart,
// matching the post editor's settings panel.
const FormSection: React.FC<FormSectionProps> = ({ children, title, compact = false }) => (
  <FieldSet className="mt-8 gap-0">
    {title && <FieldLegend className="mb-3 text-lg! font-semibold">{title}</FieldLegend>}
    <FieldGroup
      className={cn(
        '[&>[data-slot=field][data-orientation=vertical]]:mt-2',
        compact
          ? 'gap-2 [&>[data-slot=field][data-orientation=horizontal]]:min-h-7'
          : 'gap-3 [&>[data-slot=field][data-orientation=horizontal]]:min-h-(--control-height)',
      )}
    >
      {children}
    </FieldGroup>
  </FieldSet>
);

export default FormSection;
