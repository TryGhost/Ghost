import React, { ReactNode } from 'react';
import { ActionListItem, RowPrimaryAction } from '@tryghost/shade/components';
import { Box, Inline } from '@tryghost/shade/primitives';

interface ActivityItemProps {
  children?: ReactNode;
  url?: string | null;
  onClick?: () => void;
  'data-testid'?: string;
  isSelected?: boolean;
  disabled?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  children,
  url = null,
  onClick,
  'data-testid': testId,
  isSelected = false,
  disabled = false,
}) => {
  const childrenArray = React.Children.toArray(children);
  const interactive = !disabled && Boolean(url || onClick);
  const primaryClasses =
    'min-w-0 grow rounded-xs border-0 bg-transparent p-0 text-left focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden';
  return (
    <ActionListItem hover={interactive} asChild>
      <Box
        className="w-full max-w-[620px]"
        data-state={isSelected ? 'selected' : undefined}
        data-testid={testId}
        paddingY="md"
      >
        <Inline className="w-full" gap="md">
          {interactive ? (
            <Box className="relative z-10 shrink-0">{childrenArray[0]}</Box>
          ) : (
            childrenArray[0]
          )}
          {interactive ? (
            <RowPrimaryAction asChild>
              {url ? (
                <a
                  className={primaryClasses}
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                  onClick={
                    onClick
                      ? (event) => {
                          event.preventDefault();
                          onClick();
                        }
                      : undefined
                  }
                >
                  {childrenArray[1]}
                </a>
              ) : (
                <button className={primaryClasses} type="button" onClick={onClick}>
                  {childrenArray[1]}
                </button>
              )}
            </RowPrimaryAction>
          ) : (
            childrenArray[1]
          )}
          {childrenArray[2] ? (
            <Box className="relative z-10 ml-auto shrink-0">{childrenArray[2]}</Box>
          ) : (
            childrenArray[2]
          )}
        </Inline>
      </Box>
    </ActionListItem>
  );
};

export default ActivityItem;
