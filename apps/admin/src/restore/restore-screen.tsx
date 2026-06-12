import { useState } from "react";
import { useAddEditorPost, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { LocalRevisionsStore, type StoredRevision } from "@/editor/local-revisions";
import { crossShellNavigate } from "@/utils/cross-shell-navigate";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

function truncate(text: string, length = 100): string {
    return text.length > length ? `${text.slice(0, length)}…` : text;
}

/**
 * Crash-recovery screen, the React port of Ember's /restore route
 * (ghost/admin/app/templates/restore-posts.hbs). Lists the local revisions
 * written by either admin shell (shared localStorage schema, see
 * editor/local-revisions.ts) and restores one as a new draft.
 */
export function RestoreScreen() {
    // the revision list is read once on mount; this screen is the only writer
    // while it is open
    const [revisions] = useState<StoredRevision[]>(() => new LocalRevisionsStore().findAll());
    const { mutateAsync: addPost } = useAddEditorPost();
    const [restoringKey, setRestoringKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Port of Ember's localRevisions.restore(): create a new draft from the
    // revision data and open it in the editor (Ember only logged the editor
    // URL to the console; navigating is the actual UI for it)
    const handleRestore = async (revision: StoredRevision) => {
        setRestoringKey(revision.key);
        setError(null);

        try {
            const type = revision.type === "page" ? "page" : "post";
            const resource = type === "page" ? "pages" : "posts";

            const post: Partial<FullPost> = {
                title: `(Restored) ${revision.title ?? ""}`,
                lexical: revision.lexical ?? undefined,
                slug: revision.slug || "untitled",
                status: "draft",
                // the API matches tags by name and resolves authors by id
                tags: (revision.tags ?? []) as FullPost["tags"],
            };
            if (revision.authors?.length) {
                post.authors = revision.authors as FullPost["authors"];
            }

            // Revisions carry the full serialized post (the same field names
            // as Ember's serializers/post.js) — apply everything that's
            // present so the restored draft isn't gutted: feature image,
            // meta/social data, code injection, custom template, ...
            const optionalFields = [
                "custom_excerpt",
                "feature_image",
                "featured",
                "custom_template",
                "canonical_url",
                "meta_title",
                "meta_description",
                "og_image",
                "og_title",
                "og_description",
                "twitter_image",
                "twitter_title",
                "twitter_description",
                "codeinjection_head",
                "codeinjection_foot",
                "show_title_and_feature_image",
            ] as const;
            for (const field of optionalFields) {
                if (revision[field] !== undefined) {
                    (post as Record<string, unknown>)[field] = revision[field];
                }
            }
            // visibility rides with its tiers (tiers resolve by id)
            if (revision.visibility !== undefined && revision.visibility !== null) {
                post.visibility = revision.visibility as FullPost["visibility"];
                if (Array.isArray(revision.tiers)) {
                    post.tiers = revision.tiers as FullPost["tiers"];
                }
            }

            const response = await addPost({ post, resource });
            const saved = (response.posts ?? response.pages)?.[0];
            if (!saved) {
                throw new Error("Restore response did not include the new post.");
            }

            // real hash navigation so whichever shell owns the editor wakes up
            crossShellNavigate(`/editor/${type}/${saved.id}`);
        } catch (err) {
            console.error("Failed to restore post:", err);  
            setError("Failed to restore post");
            setRestoringKey(null);
        }
    };

    return (
        <section className="mx-auto w-full max-w-[1080px] p-8 md:p-12">
            <header className="border-b pb-6">
                <h2 className="text-3xl font-bold tracking-tight">Restore Posts</h2>
            </header>
            <p className="mt-6 text-sm text-muted-foreground">
                Posts are regularly saved locally on your device. If you&apos;ve lost a post, you can
                restore it from here as long as too much time hasn&apos;t passed.
            </p>
            {error && (
                <p className="mt-4 text-sm font-medium text-red" role="alert">{error}</p>
            )}
            {revisions.length ? (
                <ol className="mt-6 divide-y border-y">
                    {revisions.map(revision => (
                        <li key={revision.key} className="flex items-center gap-6 py-4" data-testid="restore-revision">
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate font-semibold" data-testid="restore-post-title">
                                    {revision.title || "(no title)"}
                                </h3>
                                {(revision.excerpt ?? revision.custom_excerpt) && (
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                        {truncate(String(revision.excerpt ?? revision.custom_excerpt))}
                                    </p>
                                )}
                            </div>
                            <time
                                className="shrink-0 text-sm whitespace-nowrap text-muted-foreground"
                                dateTime={new Date(revision.revisionTimestamp).toISOString()}
                            >
                                {dateFormatter.format(revision.revisionTimestamp)}
                            </time>
                            <Button
                                data-testid="restore-post-button"
                                disabled={restoringKey !== null}
                                variant="outline"
                                onClick={() => void handleRestore(revision)}
                            >
                                {restoringKey === revision.key ? "Restoring..." : "Restore"}
                            </Button>
                        </li>
                    ))}
                </ol>
            ) : (
                <div className="mt-16 text-center">
                    <h4 className="font-semibold text-muted-foreground">No local revisions found.</h4>
                </div>
            )}
        </section>
    );
}

export default RestoreScreen;
