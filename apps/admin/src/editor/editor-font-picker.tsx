import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import { useFocusContext } from '@tryghost/shade/app';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { editorFontPickerLabel, editorFontToggle } from '@tryghost/test-data/selectors/editor';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

/**
 * The footer's [Aa] button and the choice of font it opens. A choice applies to
 * the canvas behind the popover at once, so the writer can compare; closing the
 * popover saves the last one.
 */
export function EditorFontPicker({
  control,
  open,
  onOpenChange,
  className,
}: EditorFontPickerProps) {
  const { isAdmin7 } = useFocusContext();
  const changeOpen = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      control.save();
    }
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={editorFontPickerLabel}
          className={cn(
            'bg-background/80 text-text-secondary backdrop-blur-sm hover:text-foreground aria-expanded:text-foreground',
            isAdmin7 && '[&_svg]:stroke-2!',
            className,
          )}
          data-testid={editorFontToggle}
          shape="pill"
          size={isAdmin7 ? 'icon' : 'icon-sm'}
          variant="ghost"
        >
          <LucideIcon.ALargeSmall />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-1.5" side="top" sideOffset={8}>
        <ToggleGroup
          aria-label={editorFontPickerLabel}
          className="rounded-[calc(var(--radius-menu)-0.4rem)]"
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
              className="h-auto w-[7.6rem] flex-col gap-1.5 rounded-[calc(var(--radius-menu)-0.6rem)] pt-3.5 pb-2.5 data-[state=off]:hover:bg-surface-elevated"
              value={font}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'text-[2.6rem] leading-none text-foreground',
                  SAMPLE_FONT_CLASS[font],
                )}
              >
                Aa
              </span>
              {/* Takes the item's colour, which marks the chosen font. */}
              <span className="text-xs font-medium">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
}
