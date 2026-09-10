import React, { useRef, useState } from 'react';
import { useShade } from '@tryghost/shade/app';
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Box } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';

interface MembersHeaderSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  autoFocus?: boolean;
  collapsible?: boolean;
  ariaLabel?: string;
}

const MembersHeaderSearch: React.FC<MembersHeaderSearchProps> = ({
  search,
  onSearchChange,
  autoFocus = false,
  collapsible = false,
  ariaLabel = 'Search members',
}) => {
  const { controlShape } = useShade();
  const [expanded, setExpanded] = useState(false);
  const restoreTriggerFocus = useRef(false);
  const isExpanded = !collapsible || expanded || search.length > 0;
  const testId =
    ariaLabel === 'Search members mobile' ? 'members-mobile-search-input' : 'members-search-input';

  const field = (
    <InputGroup
      className={cn(
        'h-(--control-height) min-w-0',
        collapsible ? 'w-full' : 'basis-full lg:w-[180px] lg:basis-auto xl:w-[240px]',
      )}
      shape={controlShape}
      variant={controlShape === 'pill' ? 'secondary' : 'default'}
    >
      <InputGroupAddon>
        <LucideIcon.Search className="size-4" strokeWidth={collapsible ? 2 : 1.75} />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={ariaLabel}
        autoFocus={autoFocus || (collapsible && expanded)}
        className="!h-[34px] min-w-0"
        data-testid={testId}
        placeholder="Search members..."
        value={search}
        onBlur={() => {
          if (collapsible && !search) {
            setExpanded(false);
          }
        }}
        onChange={(event) => onSearchChange(event.target.value)}
        onFocus={() => {
          if (collapsible) {
            setExpanded(true);
          }
        }}
        onKeyDown={(event) => {
          if (collapsible && event.key === 'Escape' && !search) {
            event.preventDefault();
            event.stopPropagation();
            restoreTriggerFocus.current = true;
            setExpanded(false);
          }
        }}
      />
    </InputGroup>
  );

  if (!collapsible) {
    return field;
  }

  return (
    <Box
      className={cn(
        'shrink-0 transition-[width] duration-(--duration-base) motion-reduce:transition-none',
        isExpanded ? 'w-[160px] sm:w-[180px] xl:w-[240px]' : 'w-(--control-height)',
      )}
    >
      {isExpanded ? (
        field
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={(button) => {
                if (button && restoreTriggerFocus.current) {
                  button.focus();
                  restoreTriggerFocus.current = false;
                }
              }}
              aria-label="Search members"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setExpanded(true)}
            >
              <LucideIcon.Search className="size-4 stroke-2!" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" variant="white">
            Search members
          </TooltipContent>
        </Tooltip>
      )}
    </Box>
  );
};

export default MembersHeaderSearch;
