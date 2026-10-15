import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { editorFontToggle } from '@tryghost/test-data/selectors/editor';
import { EditorFontPicker } from '@/editor/editor-font-picker';
import type { EditorFontControl } from '@/editor/use-editor-font';
import { SettingsDisclosureRow } from './settings-navigation-row';

/**
 * The font the writer reads the post in while editing (admin7EditorImprovements):
 * a row that shows the choice beneath it rather than opening a pane. It starts
 * collapsed whenever the section list is shown again.
 */
export function EditorFontSection({ control }: { control: EditorFontControl }) {
  const [expanded, setExpanded] = useState(false);
  const choicesId = useId();
  const choicesRef = useRef<HTMLDivElement>(null);

  // The choices stay mounted so they can fold away; folded, they take no focus.
  useLayoutEffect(() => {
    if (choicesRef.current) {
      choicesRef.current.inert = !expanded;
    }
  }, [expanded]);

  return (
    <>
      <SettingsDisclosureRow
        aria-controls={choicesId}
        data-testid={editorFontToggle}
        expanded={expanded}
        icon={<LucideIcon.ALargeSmall />}
        onClick={() => setExpanded((open) => !open)}
      >
        Editor font
      </SettingsDisclosureRow>
      {/* Growing the row track from 0fr to 1fr animates to the choices' own height. */}
      <Box
        ref={choicesRef}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        id={choicesId}
      >
        <Box className="min-h-0 overflow-hidden">
          <Box className="px-5 pt-2 pb-4">
            <EditorFontPicker control={control} />
          </Box>
        </Box>
      </Box>
    </>
  );
}
