import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CodeEditor,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';

interface TagCodeInjectionAccordionProps {
  disabled?: boolean;
  headerValue: string;
  footerValue: string;
  onHeaderChange: (value: string) => void;
  onFooterChange: (value: string) => void;
}

const htmlExtensions = [() => import('@codemirror/lang-html').then((module) => module.html())];

const TagCodeInjectionAccordion: React.FC<TagCodeInjectionAccordionProps> = ({
  disabled,
  headerValue,
  footerValue,
  onHeaderChange,
  onFooterChange,
}) => {
  const hasCodeInjection = Boolean(headerValue.trim() || footerValue.trim());

  return (
    <Card data-testid="tag-code-injection-card">
      <Accordion
        defaultValue={hasCodeInjection ? 'code-injection' : undefined}
        type="single"
        collapsible
      >
        <AccordionItem className="border-b-0" value="code-injection">
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <Stack className="text-left" gap="none">
              <span className="text-[14px] font-semibold">Code injection</span>
              <span className="text-[13px] leading-[16px] font-normal tracking-normal text-muted-foreground">
                Add styles/scripts to the header and footer.
              </span>
            </Stack>
          </AccordionTrigger>
          <AccordionContent className="px-6">
            <Stack className="pt-1" gap="lg">
              <CodeEditor
                data-testid="codeinjection-head"
                editable={!disabled}
                extensions={htmlExtensions}
                height="192px"
                title={
                  <>
                    Tag header <code className="ml-1 font-normal">{'{{ghost_head}}'}</code>
                  </>
                }
                value={headerValue}
                onChange={onHeaderChange}
              />
              <CodeEditor
                data-testid="codeinjection-foot"
                editable={!disabled}
                extensions={htmlExtensions}
                height="192px"
                title={
                  <>
                    Tag footer <code className="ml-1 font-normal">{'{{ghost_foot}}'}</code>
                  </>
                }
                value={footerValue}
                onChange={onFooterChange}
              />
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default TagCodeInjectionAccordion;
