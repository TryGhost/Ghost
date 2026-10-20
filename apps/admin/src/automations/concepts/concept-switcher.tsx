import React from 'react';
import { CONCEPTS, type ConceptId, setConcept, useConcept } from './concept';
import { CANVAS_CLEARED_ATTRIBUTE } from './use-expand-from-card';
import { Tabs, TabsList, TabsTrigger } from '@tryghost/shade/components';

// A3 clears the canvas while the email editor is open: the automation header slides up
// and the flow (nodes, edges, zoom controls) fades, timed with the editor's grow/shrink.
const EDITOR = '[data-testid="automation-editor"]';
const CLEARED = `${EDITOR}[${CANVAS_CLEARED_ATTRIBUTE}]`;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const clearCanvasStyles = `
${EDITOR} > header { transition: transform 200ms ${EASE}; }
${EDITOR} .react-flow__viewport, ${EDITOR} .react-flow__panel { transition: opacity 200ms ${EASE}; }
${CLEARED} > header { transform: translateY(-100%); }
${CLEARED} .react-flow__viewport, ${CLEARED} .react-flow__panel { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  ${EDITOR} > header, ${EDITOR} .react-flow__viewport, ${EDITOR} .react-flow__panel { transition: none; }
}
`;

// NY-1715 exploration only — never merge.
const ConceptSwitcher: React.FC = () => {
  const concept = useConcept();
  return (
    <>
      <style>{clearCanvasStyles}</style>
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-border-default bg-surface-elevated p-1 shadow-md">
        <Tabs
          value={concept}
          variant="segmented-sm"
          onValueChange={(value) => value && setConcept(value as ConceptId)}
        >
          <TabsList>
            {CONCEPTS.map(({ id, label }) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </>
  );
};

export default ConceptSwitcher;
