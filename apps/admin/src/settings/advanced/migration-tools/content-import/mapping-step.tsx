import {
  Banner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { FieldPicker } from './field-picker';
import { ContentFieldMapping } from './mapping';

interface MappingStepProps {
  rows: Record<string, string>[];
  mapping: ContentFieldMapping;
  sampleIndex: number;
  disabled: boolean;
  missingTitle: boolean;
  onMappingChange: (column: string, target: string | null) => void;
  onSampleIndexChange: (index: number) => void;
}

export function MappingStep({
  rows,
  mapping,
  sampleIndex,
  disabled,
  missingTitle,
  onMappingChange,
  onSampleIndexChange,
}: MappingStepProps) {
  const row = rows[sampleIndex] ?? {};
  const columns = Object.keys(mapping.toJSON());
  const hasPrevious = sampleIndex > 0;
  const hasNext = sampleIndex < rows.length - 1;

  return (
    <Stack gap="lg">
      <Text tone="secondary">
        Choose which Ghost field each column in your CSV should import as.
      </Text>
      {missingTitle && (
        <Banner role="alert" size="sm" variant="warning">
          <Inline align="center" gap="sm">
            <LucideIcon.TriangleAlert className="size-4 shrink-0 text-state-warning" />
            <Text size="sm" weight="semibold">
              Required field missing: Title
            </Text>
          </Inline>
        </Banner>
      )}
      <div className="overflow-hidden rounded-md border border-border-default">
        <div className="max-h-[50vh] overflow-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">CSV column</TableHead>
                <TableHead className="w-1/3">
                  <Inline align="center" justify="between">
                    <span>Sample #{formatNumber(sampleIndex + 1)}</span>
                    <Inline align="center" gap="xs">
                      <button
                        aria-label="Show previous sample row"
                        className={cn(
                          'rounded p-0.5 hover:bg-interactive-hover',
                          !hasPrevious && 'cursor-default opacity-30',
                        )}
                        disabled={disabled || !hasPrevious}
                        type="button"
                        onClick={() => onSampleIndexChange(sampleIndex - 1)}
                      >
                        <LucideIcon.ChevronLeft className="size-4" />
                      </button>
                      <button
                        aria-label="Show next sample row"
                        className={cn(
                          'rounded p-0.5 hover:bg-interactive-hover',
                          !hasNext && 'cursor-default opacity-30',
                        )}
                        disabled={disabled || !hasNext}
                        type="button"
                        onClick={() => onSampleIndexChange(sampleIndex + 1)}
                      >
                        <LucideIcon.ChevronRight className="size-4" />
                      </button>
                    </Inline>
                  </Inline>
                </TableHead>
                <TableHead className="w-1/3">Import as</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column}>
                  <TableCell className="text-sm font-medium break-all">{column}</TableCell>
                  <TableCell
                    className={cn('text-sm break-all', !row[column] && 'text-muted-foreground')}
                  >
                    {row[column] || '\u00a0'}
                  </TableCell>
                  <TableCell>
                    <FieldPicker
                      column={column}
                      disabled={disabled}
                      value={mapping.get(column)}
                      onValueChange={(value) => onMappingChange(column, value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Stack>
  );
}
