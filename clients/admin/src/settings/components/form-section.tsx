import { FieldGroup, FieldLegend, FieldSet } from '@tryghost/shade/components';

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
}

// A section of form rows, optionally titled, that share one vertical rhythm.
// Horizontal fields are a control-height tall, and stacked fields sit 8px lower
// so their labels line up with horizontal ones. The row rules target Shade fields
// only, as other elements can carry data-orientation too. Sections are 32px apart,
// matching the post editor's settings panel.
const FormSection: React.FC<FormSectionProps> = ({ children, title }) => (
  <FieldSet className="mt-8 gap-0">
    {title && <FieldLegend className="mb-3 text-lg! font-semibold">{title}</FieldLegend>}
    <FieldGroup className="gap-3 [&>[data-slot=field][data-orientation=horizontal]]:min-h-(--control-height) [&>[data-slot=field][data-orientation=vertical]]:mt-2">
      {children}
    </FieldGroup>
  </FieldSet>
);

export default FormSection;
