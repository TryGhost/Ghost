import { FieldGroup, FieldLegend, FieldSet } from '@tryghost/shade/components';

interface FormSectionProps {
  children: React.ReactNode;
  title: string;
}

// A titled section of form rows that share one vertical rhythm. Horizontal fields
// are a control-height tall, and stacked fields sit 8px lower so their labels line
// up with horizontal ones. The row rules target Shade fields only, as other
// elements can carry data-orientation too. Sections are 40px apart, and the first
// section in a container sits 32px from its top.
const FormSection: React.FC<FormSectionProps> = ({ children, title }) => (
  <FieldSet className="mt-10 gap-0 first:mt-8">
    <FieldLegend className="mb-4 text-lg! font-semibold">{title}</FieldLegend>
    <FieldGroup className="gap-4 [&>[data-slot=field][data-orientation=horizontal]]:min-h-(--control-height) [&>[data-slot=field][data-orientation=vertical]]:mt-2">
      {children}
    </FieldGroup>
  </FieldSet>
);

export default FormSection;
