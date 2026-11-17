import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataList,
  DataListBody,
  DataListItemContent,
  DataListItemValue,
  DataListItemValueAbs,
  DataListRow,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SkeletonTable,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { Text } from '@tryghost/shade/primitives';

const PREVIEW_ROWS = 5;

export type TopListRow = { id: string; label: string; comments: number };

const Rows: React.FC<{ rows: TopListRow[]; onSelect: (row: TopListRow) => void }> = ({
  rows,
  onSelect,
}) => (
  <DataList>
    <DataListBody>
      {rows.map((row) => (
        <DataListRow
          key={row.id}
          className="group/row relative hover:cursor-pointer has-[:focus-visible]:before:opacity-100"
        >
          <DataListItemContent>
            {/* The button's overlay makes the whole row the click target */}
            <button
              className="truncate text-left font-medium group-hover/row:underline after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
              type="button"
              onClick={() => onSelect(row)}
            >
              {row.label}
            </button>
          </DataListItemContent>
          <DataListItemValue>
            <DataListItemValueAbs>{formatNumber(row.comments)}</DataListItemValueAbs>
          </DataListItemValue>
        </DataListRow>
      ))}
    </DataListBody>
  </DataList>
);

const CommentsTopList: React.FC<{
  title: string;
  description: string;
  rows: TopListRow[] | undefined;
  isLoading: boolean;
  onSelect: (row: TopListRow) => void;
  'data-testid'?: string;
}> = ({ title, description, rows, isLoading, onSelect, 'data-testid': testId }) => {
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const selectFromSheet = (row: TopListRow) => {
    setViewAllOpen(false);
    onSelect(row);
  };

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !rows ? (
          <SkeletonTable lines={PREVIEW_ROWS} />
        ) : rows.length ? (
          <Rows rows={rows.slice(0, PREVIEW_ROWS)} onSelect={onSelect} />
        ) : (
          <Text className="py-6 text-center" size="sm" tone="secondary">
            No comments in this period
          </Text>
        )}
      </CardContent>
      {rows && rows.length > PREVIEW_ROWS && (
        <CardFooter>
          <Sheet open={viewAllOpen} onOpenChange={setViewAllOpen}>
            <SheetTrigger asChild>
              <Button variant="subtle">
                View all <LucideIcon.TableOfContents />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto pt-0 sm:max-w-[420px]">
              <SheetHeader className="sticky top-0 z-40 -mx-6 bg-surface-elevated/60 p-6 backdrop-blur">
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
              </SheetHeader>
              <Rows rows={rows} onSelect={selectFromSheet} />
            </SheetContent>
          </Sheet>
        </CardFooter>
      )}
    </Card>
  );
};

export default CommentsTopList;
