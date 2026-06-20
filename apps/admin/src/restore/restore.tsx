import {Button, EmptyIndicator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast} from "@tryghost/shade/components";
import {ListPage} from "@tryghost/shade/page-templates";
import {PageHeader} from "@tryghost/shade/patterns";
import {LucideIcon} from "@tryghost/shade/utils";
import {useAddPost, type Post} from "@tryghost/admin-x-framework/api/posts";
import {useCallback, useState} from "react";
import {findAll, type LocalRevision} from "./local-revisions";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RELATIVE_TIME_UNITS = [
    {unit: "year", milliseconds: 365 * 24 * 60 * 60 * 1000},
    {unit: "month", milliseconds: 30 * 24 * 60 * 60 * 1000},
    {unit: "week", milliseconds: 7 * 24 * 60 * 60 * 1000},
    {unit: "day", milliseconds: 24 * 60 * 60 * 1000},
    {unit: "hour", milliseconds: 60 * 60 * 1000},
    {unit: "minute", milliseconds: 60 * 1000}
] as const;

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRevisionTitle(revision: LocalRevision): string {
    return asString(revision.title) || "(no title)";
}

function getRevisionExcerpt(revision: LocalRevision): string {
    return asString(revision.excerpt).slice(0, 100);
}

function formatCreatedDate(timestamp: unknown): string {
    const date = getRevisionDate(timestamp);

    if (!date) {
        return "";
    }

    const month = MONTHS[date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();

    return `${day} ${month} ${year}`;
}

function formatRelativeCreatedDate(timestamp: unknown): string {
    const date = getRevisionDate(timestamp);

    if (!date) {
        return "";
    }

    const diff = Date.now() - date.getTime();
    const direction = diff < 0 ? "from now" : "ago";
    const absoluteDiff = Math.abs(diff);

    for (const {unit, milliseconds} of RELATIVE_TIME_UNITS) {
        if (absoluteDiff >= milliseconds) {
            const value = Math.round(absoluteDiff / milliseconds);
            return `${value} ${unit}${value === 1 ? "" : "s"} ${direction}`;
        }
    }

    return direction === "ago" ? "just now" : "in a few seconds";
}

function getRevisionDate(timestamp: unknown): Date | null {
    if (typeof timestamp !== "number") {
        return null;
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function getRelationReferences(value: unknown): {id: string}[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const relations = value.flatMap((item) => {
        if (isRecord(item) && typeof item.id === "string") {
            return [{id: item.id}];
        }

        return [];
    });

    return relations.length > 0 ? relations : undefined;
}

function getRevisionTags(value: unknown): unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
}

function getRestoredPost(revision: LocalRevision): Partial<Post> {
    const slug = asString(revision.slug);

    return {
        authors: getRelationReferences(revision.authors),
        lexical: asString(revision.lexical),
        post_revisions: [],
        ...(slug ? {slug} : {}),
        status: "draft",
        tags: getRevisionTags(revision.tags),
        title: `(Restored) ${getRevisionTitle(revision)}`,
        type: asString(revision.type) || "post"
    };
}

export default function RestoreRoute() {
    const [revisions] = useState(() => findAll());
    const [restoringRevisionKey, setRestoringRevisionKey] = useState<string | null>(null);
    const addPost = useAddPost();
    const handleRestore = useCallback(async (revision: LocalRevision) => {
        setRestoringRevisionKey(revision.key);

        try {
            await addPost.mutateAsync(getRestoredPost(revision));
            toast.success("Post restored successfully");
        } catch {
            toast.error("Failed to restore post");
        } finally {
            setRestoringRevisionKey(null);
        }
    }, [addPost]);

    return (
        <div className="size-full">
            <div className="relative mx-auto flex h-full max-w-page flex-col">
                <ListPage>
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>Restore Posts</PageHeader.Title>
                            </PageHeader.Left>
                        </PageHeader>
                    </ListPage.Header>

                    <ListPage.Body>
                        <section className="flex w-full flex-col gap-6">
                            <p className="text-sm leading-6 text-muted-foreground">
                                Posts are regularly saved locally on your device. If you&apos;ve lost a post, you can restore it from here as long as too much time hasn&apos;t passed.
                            </p>

                            {revisions.length > 0 ? (
                                <div className="w-full overflow-x-auto">
                                    <Table className="w-full table-fixed border-collapse">
                                        <TableHeader className="hidden bg-transparent sm:table-header-group">
                                            <TableRow>
                                                <TableHead className="w-auto px-4">Title</TableHead>
                                                <TableHead className="hidden w-48 px-4 sm:table-cell">Created</TableHead>
                                                <TableHead className="w-28 px-4" aria-label="Actions" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {revisions.map((revision) => {
                                                const isRestoring = restoringRevisionKey === revision.key;

                                                return (
                                                    <TableRow
                                                        key={revision.key}
                                                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 sm:table-row sm:p-0"
                                                    >
                                                        <TableCell className="min-w-0 p-0 sm:p-4">
                                                            <h2 className="truncate text-sm font-semibold text-foreground" data-test-id="restore-post-title">
                                                                {getRevisionTitle(revision)}
                                                            </h2>
                                                            <p className="mt-1 truncate text-sm text-muted-foreground">
                                                                {getRevisionExcerpt(revision)}
                                                            </p>
                                                            <div className="mt-1 sm:hidden">
                                                                <RestoreRevisionCreatedDate timestamp={revision.revisionTimestamp} />
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="hidden px-4 py-3 sm:table-cell">
                                                            <RestoreRevisionCreatedDate timestamp={revision.revisionTimestamp} />
                                                        </TableCell>

                                                        <TableCell className="p-0 text-right sm:p-4">
                                                            <Button
                                                                data-test-id="restore-post-button"
                                                                disabled={isRestoring}
                                                                onClick={() => {
                                                                    void handleRestore(revision);
                                                                }}
                                                                size="sm"
                                                                type="button"
                                                                variant="outline"
                                                            >
                                                                {isRestoring && (
                                                                    <LucideIcon.Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                                                                )}
                                                                {isRestoring ? "Restoring" : "Restore"}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-border">
                                    <EmptyIndicator title="No local revisions found.">
                                        <LucideIcon.FileClock />
                                    </EmptyIndicator>
                                </div>
                            )}
                        </section>
                    </ListPage.Body>
                </ListPage>
            </div>
        </div>
    );
}

function RestoreRevisionCreatedDate({timestamp}: { timestamp: unknown }) {
    const revisionDate = getRevisionDate(timestamp);

    return (
        <div>
            <time className="block text-base" dateTime={revisionDate?.toISOString()}>
                {formatCreatedDate(timestamp)}
            </time>
            <div className="text-base text-muted-foreground">
                {formatRelativeCreatedDate(timestamp)}
            </div>
        </div>
    );
}
