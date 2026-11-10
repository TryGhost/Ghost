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
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const scrollOnExpandRef = React.useRef(false);
  const cancelScrollRef = React.useRef<(() => void) | undefined>(undefined);

  React.useEffect(() => () => cancelScrollRef.current?.(), []);

  const onExpandedChange = (value: string) => {
    cancelScrollRef.current?.();
    scrollOnExpandRef.current = value === 'code-injection';
  };

  const onEditorsReady = () => {
    if (!scrollOnExpandRef.current) {
      return;
    }
    let cancelled = false;
    // CodeMirror loads lazily. Wait for it and the opening animation so the
    // page has enough scrollable space before bringing the section into view.
    const frame = requestAnimationFrame(() => {
      void Promise.allSettled(
        (contentRef.current?.getAnimations() ?? []).map((animation) => animation.finished),
      ).then(() => {
        if (!cancelled && scrollOnExpandRef.current) {
          scrollOnExpandRef.current = false;
          sectionRef.current?.scrollIntoView({
            block: 'start',
            inline: 'nearest',
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
        }
      });
    });
    cancelScrollRef.current = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  };

  return (
    <Card
      ref={sectionRef}
      className="scroll-mt-6"
      data-testid="tag-code-injection-card"
      variant={admin7Design ? 'plain' : 'outline'}
    >
      <Accordion
        defaultValue={hasCodeInjection ? 'code-injection' : undefined}
        type="single"
        collapsible
        onValueChange={onExpandedChange}
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
          <AccordionContent ref={contentRef} className={admin7Design ? 'pt-5' : 'px-6'}>
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
                onCreateEditor={onEditorsReady}
              />
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default TagCodeInjectionAccordion;
