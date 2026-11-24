import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@tryghost/shade/components';
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

// Horizontal fields are a control-height tall, and stacked fields sit 8px lower
// so their labels line up with horizontal ones. The row rules target Shade fields
// only, as other elements can carry data-orientation too.
const rowsClassName = (compact: boolean) =>
  cn(
    '[&>[data-slot=field][data-orientation=vertical]]:mt-2',
    compact
      ? 'gap-2 [&>[data-slot=field][data-orientation=horizontal]]:min-h-7'
      : 'gap-3 [&>[data-slot=field][data-orientation=horizontal]]:min-h-(--control-height)',
  );

// A section of form rows, optionally titled, that share one vertical rhythm.
// Sections are 32px apart, matching the post editor's settings panel.
const FormSection: React.FC<FormSectionProps> = ({ children, title, compact = false }) => (
  <FieldSet className="mt-8 gap-0">
    {title && <FieldLegend className="mb-3 text-lg! font-semibold">{title}</FieldLegend>}
    <FieldGroup className={rowsClassName(compact)}>{children}</FieldGroup>
  </FieldSet>
);

interface FormAccordionProps {
  children: React.ReactNode;
  /** The `value` of the section that starts open. */
  defaultValue: string;
}

/** Stacks `FormAccordionSection`s so only one is open at a time. */
export const FormAccordion: React.FC<FormAccordionProps> = ({ children, defaultValue }) => (
  <Accordion defaultValue={defaultValue} type="single" collapsible>
    {children}
  </Accordion>
);

interface FormAccordionSectionProps extends Required<Pick<FormSectionProps, 'title'>> {
  children: React.ReactNode;
  compact?: boolean;
  value: string;
}

/** A `FormSection` that folds away under its title, for use inside a `FormAccordion`. */
export const FormAccordionSection: React.FC<FormAccordionSectionProps> = ({
  children,
  compact = false,
  title,
  value,
}) => (
  <AccordionItem className="border-border-default" value={value}>
    <AccordionTrigger className="py-4 text-lg font-semibold hover:no-underline">
      {title}
    </AccordionTrigger>
    <AccordionContent className="pb-6">
      <FieldSet className="gap-0">
        <FieldLegend className="sr-only">{title}</FieldLegend>
        <FieldGroup className={rowsClassName(compact)}>{children}</FieldGroup>
      </FieldSet>
    </AccordionContent>
  </AccordionItem>
);

export default FormSection;
