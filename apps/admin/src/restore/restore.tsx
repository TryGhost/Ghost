import {Button, EmptyIndicator} from "@tryghost/shade/components";
import {ListPage} from "@tryghost/shade/page-templates";
import {PageHeader} from "@tryghost/shade/patterns";
import {LucideIcon} from "@tryghost/shade/utils";
import {useState} from "react";
import {findAll, type LocalRevision} from "./local-revisions";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
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

    const month = MONTHS[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${month} ${day}, ${year} ${hours}:${minutes}`;
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

export default function RestoreRoute() {
    const [revisions] = useState(() => findAll());

    return (
        <ListPage>
            <ListPage.Header>
                <PageHeader blurredBackground={false} sticky={false}>
                    <PageHeader.Left>
                        <PageHeader.Title>Restore Posts</PageHeader.Title>
                    </PageHeader.Left>
                </PageHeader>
            </ListPage.Header>

            <ListPage.Body className="px-0">
                <section className="flex w-full flex-col gap-6">
                    <p className="text-sm leading-6 text-muted-foreground">
                        Posts are regularly saved locally on your device. If you&apos;ve lost a post, you can restore it from here as long as too much time hasn&apos;t passed.
                    </p>

                    {revisions.length > 0 ? (
                        <div className="overflow-hidden rounded-md border border-border bg-background">
                            <div className="hidden grid-cols-12 items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold tracking-normal text-muted-foreground uppercase sm:grid">
                                <div className="col-span-7">Title</div>
                                <div className="col-span-3">Created</div>
                                <div className="col-span-2" aria-hidden="true" />
                            </div>

                            <ol className="divide-y divide-border">
                                {revisions.map((revision) => {
                                    const revisionDate = getRevisionDate(revision.revisionTimestamp);

                                    return (
                                        <li
                                            key={revision.key}
                                            className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-12 sm:items-center sm:gap-4"
                                        >
                                            <div className="min-w-0 sm:col-span-7">
                                                <h2 className="truncate text-sm font-semibold text-foreground" data-test-id="restore-post-title">
                                                    {getRevisionTitle(revision)}
                                                </h2>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                    {getRevisionExcerpt(revision)}
                                                </p>
                                            </div>

                                            <time className="text-sm text-muted-foreground sm:col-span-3" dateTime={revisionDate?.toISOString()}>
                                                {formatCreatedDate(revision.revisionTimestamp)}
                                            </time>

                                            <div className="flex justify-start sm:col-span-2 sm:justify-end">
                                                <Button
                                                    data-test-id="restore-post-button"
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Restore
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
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
    );
}
