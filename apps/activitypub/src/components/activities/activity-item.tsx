import React, { ReactNode } from 'react';
import { ActionListItem, RowPrimaryAction } from '@tryghost/shade/components';
import { Box, Inline } from '@tryghost/shade/primitives';
import { useShade } from '@tryghost/shade/app';

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
  const { admin7Design } = useShade();
  const childrenArray = React.Children.toArray(children);
  const interactive = !disabled && Boolean(url || onClick);
  const primaryClasses =
    'min-w-0 grow rounded-xs border-0 bg-transparent p-0 text-left focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden';
  const item = (
    <ActionListItem hover={interactive} asChild>
      <Box
        className={
          admin7Design
            ? 'w-full max-w-[620px]'
            : `relative flex w-full max-w-[620px] cursor-pointer flex-col before:absolute before:inset-x-[-16px] before:inset-y-[-1px] before:rounded-md before:bg-gray-50 before:transition-opacity hover:z-10 hover:cursor-pointer hover:border-b-transparent hover:before:opacity-100 dark:before:bg-gray-950 ${isSelected ? 'z-10 before:opacity-100' : 'before:opacity-0'}`
        }
        data-state={admin7Design && isSelected ? 'selected' : undefined}
        data-testid={testId}
        paddingY={admin7Design ? 'md' : undefined}
        onClick={
          admin7Design
            ? undefined
            : () => {
                if (!url && onClick) {
                  onClick();
                }
              }
        }
      >
        <Inline className={admin7Design ? 'w-full' : 'relative z-10 w-full py-3'} gap="md">
          {admin7Design && interactive ? (
            <Box className="relative z-10 shrink-0">{childrenArray[0]}</Box>
          ) : (
            childrenArray[0]
          )}
          {admin7Design && interactive ? (
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
          {admin7Design && childrenArray[2] ? (
            <Box className="relative z-10 ml-auto shrink-0">{childrenArray[2]}</Box>
          ) : (
            childrenArray[2]
          )}
        </Inline>
      </Box>
    </ActionListItem>
  );

  return !admin7Design && url ? (
    <a
      href={url}
      rel="noreferrer"
      target="_blank"
      onClick={(event) => {
        if (onClick) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {item}
    </a>
  ) : (
    item
  );
};

export default ActivityItem;
