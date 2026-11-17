import React from 'react';
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

const PREVIEW_ROWS = 5;

export type TopListRow = { id: string; label: string; comments: number };

const Rows: React.FC<{ rows: TopListRow[] }> = ({ rows }) => (
  <DataList>
    <DataListBody>
      {rows.map((row) => (
        <DataListRow key={row.id}>
          <DataListItemContent>
            <span className="truncate font-medium">{row.label}</span>
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
  'data-testid'?: string;
}> = ({ title, description, rows, isLoading, 'data-testid': testId }) => (
  <Card data-testid={testId}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {isLoading || !rows ? (
        <SkeletonTable lines={PREVIEW_ROWS} />
      ) : rows.length ? (
        <Rows rows={rows.slice(0, PREVIEW_ROWS)} />
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No comments in this period</p>
      )}
    </CardContent>
    {rows && rows.length > PREVIEW_ROWS && (
      <CardFooter>
        <Sheet>
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
            <Rows rows={rows} />
          </SheetContent>
        </Sheet>
      </CardFooter>
    )}
  </Card>
);

export default CommentsTopList;
