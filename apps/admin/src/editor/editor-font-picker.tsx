import { ToggleGroup, ToggleGroupItem } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { editorFontPickerLabel } from '@tryghost/test-data/selectors/editor';
import { EDITOR_FONT_OPTIONS, type EditorFont, isEditorFont } from './editor-font';
import type { EditorFontControl } from './use-editor-font';

/** Each choice's sample is set in the font it picks. */
const SAMPLE_FONT_CLASS: Record<EditorFont, string> = {
  serif: 'font-editor-serif',
  sans: 'font-editor-sans',
  mono: 'font-editor-mono',
};

export interface EditorFontPickerProps {
  control: EditorFontControl;
  className?: string;
}

/**
 * The choice of font the editor is set in, each shown as a sample in its own
 * font. A choice applies to the canvas at once, so the writer can compare, and
 * is saved as it is made.
 */
export function EditorFontPicker({ control, className }: EditorFontPickerProps) {
  return (
    <ToggleGroup
      aria-label={editorFontPickerLabel}
      className={cn('w-full border border-border/60', className)}
      shape="rounded"
      type="single"
      value={control.font}
      onValueChange={(value) => {
        // Choosing the current font again would clear the group; it stays chosen.
        if (isEditorFont(value)) {
          control.choose(value);
        }
      }}
    >
      {EDITOR_FONT_OPTIONS.map(({ font, label }) => (
        <ToggleGroupItem
          key={font}
          className="h-auto flex-1 flex-col gap-1.5 pt-3.5 pb-2.5 data-[state=off]:hover:bg-interactive-hover"
          value={font}
        >
          <span
            aria-hidden="true"
            className={cn('text-[2.6rem] leading-none text-foreground', SAMPLE_FONT_CLASS[font])}
          >
            Aa
          </span>
          {/* Takes the item's colour, which marks the chosen font. */}
          <span className="text-xs font-medium">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
