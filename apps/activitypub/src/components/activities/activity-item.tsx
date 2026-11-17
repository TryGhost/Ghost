import React, { ReactNode, useRef } from 'react';
import { Box, Inline } from '@tryghost/shade/primitives';
import { cn, useRowPress } from '@tryghost/shade/utils';
import { rowSurface, rowSurfaceClasses } from '@tryghost/shade/components';

interface ActivityItemProps {
  children?: ReactNode;
  url?: string | null;
  onClick?: () => void;
  'data-testid'?: string;
  isSelected?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  children,
  url = null,
  onClick,
  'data-testid': testId,
  isSelected = false,
}) => {
  const childrenArray = React.Children.toArray(children);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const interactive = Boolean(url || onClick);
  const press = useRowPress<HTMLDivElement>({}, interactive);
  const primaryClasses =
    'min-w-0 grow rounded-xs border-0 bg-transparent p-0 text-left focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden';

  const forwardLinkGesture = (event: React.MouseEvent<HTMLDivElement>) => {
    const link = linkRef.current;
    if (!link) {
      return;
    }
    event.stopPropagation();
    const allowed = link.dispatchEvent(
      new MouseEvent(event.type, {
        bubbles: true,
        cancelable: true,
        button: event.button,
        buttons: event.buttons,
        detail: event.detail,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      }),
    );
    if (!allowed) {
      event.preventDefault();
    }
  };

  return (
    <Box
      className={cn(
        rowSurface(interactive ? 'interactive' : 'static'),
        'w-full max-w-[620px]',
        interactive && 'cursor-pointer',
      )}
      data-state={isSelected ? 'selected' : undefined}
      data-testid={testId}
      paddingY="md"
      {...press}
      onAuxClick={(event) => {
        if (
          url &&
          event.button === 1 &&
          !event.defaultPrevented &&
          event.target instanceof Element &&
          !event.target.closest('a, button, input, select, textarea, [role="checkbox"]')
        ) {
          const link = linkRef.current;
          if (link) {
            // Synthetic auxclick has no native navigation default in Chromium.
            event.preventDefault();
            event.stopPropagation();
            window.open(link.href, '_blank', 'noopener,noreferrer');
          }
        }
      }}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          !(event.target instanceof Element) ||
          event.target.closest('a, button, input, select, textarea, [role="checkbox"]')
        ) {
          return;
        }
        if (onClick) {
          onClick();
        } else if (url) {
          forwardLinkGesture(event);
        }
      }}
    >
      <Inline className="w-full" gap="md">
        {interactive ? (
          <Box className="relative z-10 shrink-0">{childrenArray[0]}</Box>
        ) : (
          childrenArray[0]
        )}
        {url ? (
          <a
            ref={linkRef}
            className={cn(primaryClasses, rowSurfaceClasses.primaryAction)}
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
        ) : onClick ? (
          <button
            className={cn(primaryClasses, rowSurfaceClasses.primaryAction)}
            type="button"
            onClick={onClick}
          >
            {childrenArray[1]}
          </button>
        ) : (
          childrenArray[1]
        )}
        {childrenArray[2] && (
          <Box className="relative z-10 ml-auto shrink-0">{childrenArray[2]}</Box>
        )}
      </Inline>
    </Box>
  );
};

export default ActivityItem;
