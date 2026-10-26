import { useContext } from 'react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

import { HelpPanelSizeContext } from './use-help-panel-size';

/*
 * The button in the Help panel's headers that maximizes it to take over the
 * page, or restores it beside the page (use-help-panel-size.ts).
 */

/** Maximizes the panel over the page, or restores it beside the page. */
export function HelpPanelSizeButton() {
  const size = useContext(HelpPanelSizeContext);
  if (!size) {
    return null;
  }
  const label = size.maximized ? 'Restore beside the page' : 'Expand to the whole page';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} size="icon-sm" variant="ghost" onClick={size.toggleMaximized}>
          {size.maximized ? <LucideIcon.Minimize2 /> : <LucideIcon.Maximize2 />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
