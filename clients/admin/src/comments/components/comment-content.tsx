import { Button } from '@tryghost/shade/components';
import { type Comment } from '@tryghost/admin-x-framework/api/comments';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Stack } from '@tryghost/shade/primitives';
import { useEffect, useRef, useState } from 'react';

function ExpandButton({
  onClick,
  expanded,
  compact,
}: {
  onClick: () => void;
  expanded: boolean;
  compact: boolean;
}) {
  return (
    <Button
      className={cn(
        'shrink-0 gap-0.5 self-start p-0 hover:bg-transparent',
        compact ? 'text-md' : 'text-base',
      )}
      variant="ghost"
      onClick={onClick}
    >
      {expanded ? 'Show less' : 'Show more'}
      {expanded ? <LucideIcon.ChevronUp /> : <LucideIcon.ChevronDown />}
    </Button>
  );
}

function CommentContent({ item, compact = false }: { item: Comment; compact?: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Don't recalculate clamping while expanded, as the content won't be clamped
    // and we'd incorrectly hide the ExpandButton
    if (isExpanded) {
      return;
    }

    const checkIfClamped = () => {
      if (contentRef.current) {
        // Check if the content is clamped by comparing scrollHeight with clientHeight
        setIsClamped(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
    };

    checkIfClamped();
    // Recheck on window resize only when collapsed
    window.addEventListener('resize', checkIfClamped);
    return () => window.removeEventListener('resize', checkIfClamped);
  }, [item.html, isExpanded, compact]);

  return (
    <Stack className={compact ? undefined : 'mt-2'} gap="sm">
      <div
        className={`flex max-w-full flex-col items-start ${item.status === 'hidden' && 'opacity-50'}`}
      >
        <div
          dangerouslySetInnerHTML={{ __html: item.html || '' }}
          ref={contentRef}
          className={cn(
            'prose balance max-w-[80ch] flex-1 leading-[1.5em] [&_*]:leading-[1.5em] [&_*]:font-normal [&_a]:underline [&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground [&_blockquote]:p-0 [&_blockquote]:pl-3 [&_blockquote_p]:mt-0',
            compact ? 'text-md [&_*]:text-md' : 'text-base [&_*]:text-base',
            isExpanded
              ? '-mb-1 [&_p]:mb-[0.85em]'
              : 'mb-1 line-clamp-2 [&_blockquote+p]:mt-1 [&_p]:m-0',
          )}
        />
        {isClamped && (
          <ExpandButton
            compact={compact}
            expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        )}
      </div>
    </Stack>
  );
}

export default CommentContent;
