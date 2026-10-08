import { Skeleton } from '@tryghost/shade/components';
import { Box, Inline, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

// Sized by its container, so widths can be fractions of the column.
function Bone({ className, rounded = 'rounded-sm' }: { className: string; rounded?: string }) {
  return (
    <Skeleton
      className={cn('h-full', rounded)}
      containerClassName={cn('flex shrink-0', className)}
    />
  );
}

const BODY_LINES = [
  ['w-full', 'w-[96%]', 'w-[88%]', 'w-[62%]'],
  ['w-[94%]', 'w-full', 'w-[45%]'],
];

/**
 * The editor's shell while its code or post loads: the header row and the
 * document column at the editor's own geometry, so the content fills in rather
 * than moving into place. Kept outside the editor chunk for the route fallback.
 */
export function EditorSkeleton() {
  return (
    <Stack aria-busy="true" className="h-full min-h-0" gap="none">
      <span className="sr-only" role="status">
        Loading
      </span>
      <Inline
        align="center"
        aria-hidden="true"
        className="shrink-0 pt-[calc(var(--spacing)*5+1px)] pr-[calc(var(--spacing)*6+1px)] pb-3 pl-4 max-[500px]:px-3 max-[500px]:pt-3"
        gap="sm"
        justify="between"
      >
        <Inline align="center" gap="md">
          <Bone
            className="h-(--control-height) w-20 max-[500px]:w-(--control-height)"
            rounded="rounded-control"
          />
          <Bone className="h-4 w-14" />
        </Inline>
        <Inline align="center" gap="md">
          <Bone
            className="h-(--control-height) w-18 max-[500px]:hidden"
            rounded="rounded-control"
          />
          <Bone
            className="h-(--control-height) w-20 max-[500px]:hidden"
            rounded="rounded-control"
          />
          <Bone className="size-(--control-height)" rounded="rounded-control" />
        </Inline>
      </Inline>
      <Box aria-hidden="true" className="min-h-0 flex-1 overflow-hidden px-6 pt-12">
        <Stack className="mx-auto w-full max-w-[740px]" gap="none">
          <Inline align="center" className="mb-4 h-14">
            <Bone className="h-4 w-36" />
          </Inline>
          <Inline
            align="center"
            className="mb-4 h-[5.28rem] pb-1 max-[769px]:h-[3.96rem] max-[501px]:h-[3.08rem]"
          >
            <Bone className="h-[70%] w-3/5" />
          </Inline>
          <Stack gap="2xl">
            {BODY_LINES.map((paragraph) => (
              <Stack key={paragraph.join()} gap="md">
                {paragraph.map((width) => (
                  <Bone key={width} className={cn('h-4', width)} />
                ))}
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
