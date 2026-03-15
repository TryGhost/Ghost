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
            className="flex items-start gap-6 p-2 -mx-2 rounded-md hover:bg-muted/80 transition-colors"
            data-test-entry
            href={entry.url}
            rel="noopener noreferrer"
            target="_blank"
        >
            {entry.featureImage && (
                <img
                    alt={entry.title}
                    className="flex-shrink-0 w-40 h-[110px] object-cover rounded"
                    data-test-entry-image
                    src={entry.featureImage}
                />
            )}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold text-foreground mt-1.5" data-test-entry-title>
                    {entry.title}
                </h2>
                <p className="text-sm text-gray-700 leading-[1.45] line-clamp-2" data-test-entry-excerpt>
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
