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
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

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
  const admin7Design = useFeatureFlag('admin7Design');
  const hasCodeInjection = Boolean(headerValue.trim() || footerValue.trim());

  return (
    <Card data-testid="tag-code-injection-card" variant={admin7Design ? 'plain' : 'outline'}>
      <Accordion
        defaultValue={hasCodeInjection ? 'code-injection' : undefined}
        type="single"
        collapsible
      >
        <AccordionItem className="border-b-0" value="code-injection">
          <AccordionTrigger
            className={
              admin7Design
                ? 'border-b border-border pt-0 pb-3 hover:no-underline'
                : 'px-6 py-5 hover:no-underline'
            }
          >
            <Stack className="text-left" gap={admin7Design ? 'xs' : 'none'}>
              <span
                className={
                  admin7Design
                    ? 'section-heading text-base font-semibold'
                    : 'text-[14px] font-semibold'
                }
              >
                Code injection
              </span>
              <span className="text-[13px] leading-[16px] font-normal tracking-normal text-muted-foreground">
                Add styles/scripts to the header and footer.
              </span>
            </Stack>
          </AccordionTrigger>
          <AccordionContent className={admin7Design ? 'pt-5' : 'px-6'}>
            <Stack className={admin7Design ? undefined : 'pt-1'} gap="lg">
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
