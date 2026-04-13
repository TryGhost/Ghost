import type { ChangelogEntry as ChangelogEntryType } from "@/whats-new/hooks/use-changelog";

interface ChangelogEntryProps {
    entry: ChangelogEntryType;
}

/**
 * Format date as "DD MMMM YYYY" (e.g., "29 October 2024")
 * Matches the format used in Ember: {{moment-format entry.published_at "DD MMMM YYYY"}}
 */
function formatPublishedDate(date: Date): string {
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function ChangelogEntry({ entry }: ChangelogEntryProps) {
    return (
        <a
            className="-mx-2 flex items-start gap-6 rounded-md p-2 transition-colors hover:bg-muted/80"
            data-test-entry
            href={entry.url}
            rel="noopener noreferrer"
            target="_blank"
        >
            {entry.featureImage && (
                <img
                    alt={entry.title}
                    className="h-[110px] w-40 flex-shrink-0 rounded object-cover"
                    data-test-entry-image
                    src={entry.featureImage}
                />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h2 className="mt-1.5 text-[17px] font-semibold text-foreground" data-test-entry-title>
                    {entry.title}
                </h2>
                <p className="line-clamp-2 text-sm leading-[1.45] text-gray-700" data-test-entry-excerpt>
                    {entry.customExcerpt}
                </p>
                <span className="text-sm text-gray-600" data-test-entry-date>
                    {formatPublishedDate(entry.publishedAt)}
                </span>
            </div>
        </a>
    );
}

export default ChangelogEntry;
