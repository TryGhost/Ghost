import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useKoenigFileUpload } from "@tryghost/admin-x-framework";
import { crossShellNavigate } from "@/utils/cross-shell-navigate";
import type { EditorResource } from "@tryghost/admin-x-framework/api/editor";
import { useBulkDeletePosts, useDeletePost } from "@tryghost/admin-x-framework/api/posts";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseTags } from "@tryghost/admin-x-framework/api/tags";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Badge,
    Button,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Textarea,
} from "@tryghost/shade/components";
import type { UseEditorResult } from "@/editor/use-editor";
import {
    DATE_FORMAT_PATTERN,
    formatDateInTimezone,
    formatTimeInTimezone,
    zonedDateTimeToUtc,
} from "./publish-time";

// Ember validators/post.js customExcerpt
const EXCERPT_MAX_LENGTH = 300;

function FieldError({ children }: { children: string | null }) {
    if (!children) {
        return null;
    }
    return <p className="mt-1 text-sm text-red-600">{children}</p>;
}

/**
 * Post URL (slug) field. The input is local scratch state (Ember's
 * boundOneWay slugValue); committing on blur runs the server-side
 * sanitize/uniqueness pass and saves (editor.updateSlug).
 */
function PostUrlField({ editor, noun }: { editor: UseEditorResult; noun: string }) {
    const committedSlug = editor.state.slugScratch;
    const [value, setValue] = useState(committedSlug);

    // resync when the committed slug changes (save responses, title regen)
    useEffect(() => {
        setValue(committedSlug);
    }, [committedSlug]);

    const handleBlur = () => {
        // show the committed slug while the server cleans the candidate; a
        // successful commit changes the committed slug and resyncs the input
        // (Ember resets slugValue the same way when the change is a no-op)
        setValue(committedSlug);
        void editor.updateSlug(value);
    };

    return (
        <div>
            <Label htmlFor="url">{noun} URL</Label>
            <Input
                className="mt-1"
                id="url"
                value={value}
                onBlur={handleBlur}
                onChange={event => setValue(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
            />
        </div>
    );
}

/**
 * Publish date + time fields (Ember gh-date-time-picker inside the PSM).
 * Values are displayed and entered in the site timezone; drafts fall back to
 * the current time until a date is committed. Scheduled posts are read-only
 * here — rescheduling happens in the publish flow ("Use the publish menu").
 */
function PublishDateTimeFields({ editor }: { editor: UseEditorResult }) {
    const { state, dispatch } = editor;
    const post = state.post;

    const { data: settingsData } = useBrowseSettings();
    const timezone = getSettingValue<string>(settingsData?.settings, "timezone") ?? "Etc/UTC";

    const publishedAt = state.publishedAtScratch;
    const fallbackNow = useRef(new Date());
    const baseInstant = publishedAt ?? fallbackNow.current;

    const [dateValue, setDateValue] = useState(() => formatDateInTimezone(baseInstant, timezone));
    const [timeValue, setTimeValue] = useState(() => formatTimeInTimezone(baseInstant, timezone));
    const [dateError, setDateError] = useState<string | null>(null);
    const [timeError, setTimeError] = useState<string | null>(null);

    // resync the inputs when the committed value (or timezone) changes
    useEffect(() => {
        const instant = publishedAt ?? fallbackNow.current;
        setDateValue(formatDateInTimezone(instant, timezone));
        setTimeValue(formatTimeInTimezone(instant, timezone));
        setDateError(null);
        setTimeError(null);
    }, [publishedAt, timezone]);

    if (!post) {
        return null;
    }

    const isScheduled = post.status === "scheduled";
    const pastScheduledTime = isScheduled && publishedAt !== null && Date.parse(publishedAt) < Date.now();
    const label = !isScheduled || pastScheduledTime ? "Publish date" : "Scheduled date";

    const commit = (date: string, time: string) => {
        const utcIso = zonedDateTimeToUtc(date, time, timezone);
        if (!utcIso) {
            setDateError("Invalid date");
            return;
        }

        // Ember validators/post.js publishedAtBlogDate: a draft/published
        // post's publish date must be in the past (backdating only; future
        // dates are set by scheduling through the publish flow)
        if ((post.status === "draft" || post.status === "published") && Date.parse(utcIso) >= Date.now()) {
            setDateError("Please choose a past date and time.");
            return;
        }

        setDateError(null);
        setTimeError(null);

        if (utcIso === publishedAt) {
            return;
        }

        // new posts only validate — the date is deferred until the post
        // exists (Ember setPublishedAtBlogDate's isNew branch)
        if (post.id === null) {
            return;
        }

        dispatch({ type: "SCRATCH_CHANGED", field: "publishedAt", value: utcIso });
        dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
    };

    const commitDate = (value: string) => {
        if (!value) {
            // reset to the previous state (Ember onDateBlur with empty value)
            setDateValue(formatDateInTimezone(baseInstant, timezone));
            setDateError(null);
            return;
        }
        if (!DATE_FORMAT_PATTERN.test(value)) {
            setDateError("Invalid date format, must be YYYY-MM-DD");
            return;
        }
        commit(value, timeValue);
    };

    const commitTime = (value: string) => {
        // Ember setTimeInternal pads `9:00` to `09:00`
        const time = /^\d:\d\d$/.test(value) ? `0${value}` : value;
        if (!time) {
            setTimeValue(formatTimeInTimezone(baseInstant, timezone));
            setTimeError(null);
            return;
        }
        if (!/^(([0-1]?[0-9])|([2][0-3])):([0-5][0-9])$/.test(time)) {
            setTimeError('Must be in format: "15:00"');
            return;
        }
        setTimeValue(time);
        commit(dateValue, time);
    };

    return (
        <div>
            <Label htmlFor="publish-date">{label}</Label>
            <div className="mt-1 flex gap-2">
                <Input
                    aria-label="Date Picker"
                    className="flex-1"
                    disabled={isScheduled}
                    id="publish-date"
                    placeholder="YYYY-MM-DD"
                    value={dateValue}
                    onBlur={event => commitDate(event.target.value.trim())}
                    onChange={event => setDateValue(event.target.value)}
                />
                <Input
                    aria-label="Time Picker"
                    className="w-24"
                    disabled={isScheduled}
                    placeholder="HH:MM"
                    value={timeValue}
                    onBlur={event => commitTime(event.target.value.trim())}
                    onChange={event => setTimeValue(event.target.value)}
                />
            </div>
            <FieldError>{dateError}</FieldError>
            <FieldError>{timeError}</FieldError>
            {isScheduled && !pastScheduledTime ? (
                <p className="mt-1 text-sm text-gray-600">Use the publish menu to re-schedule</p>
            ) : null}
        </div>
    );
}

/**
 * Tags multi-select (Ember gh-psm-tags-input). Selecting/removing a tag
 * saves immediately for existing posts; unknown names are created by the
 * server when the post is saved.
 */
function TagsField({ editor }: { editor: UseEditorResult }) {
    const { state, dispatch } = editor;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    // include internal tags, like Ember's store.query('tag', {limit: 'all'})
    const { data: tagsData } = useBrowseTags({
        filter: { visibility: "[public,internal]" },
        searchParams: { limit: "all" },
    });

    const selected = state.tagNamesScratch;
    const availableTags = tagsData?.tags ?? [];

    const setTags = (tagNames: string[]) => {
        dispatch({ type: "TAGS_CHANGED", tagNames });
        if (state.post?.id) {
            dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
        }
    };

    const toggleTag = (name: string) => {
        setTags(selected.includes(name) ? selected.filter(tag => tag !== name) : [...selected, name]);
    };

    const trimmedSearch = search.trim();
    const canCreate = trimmedSearch !== ""
        && !availableTags.some(tag => tag.name.toLowerCase() === trimmedSearch.toLowerCase())
        && !selected.some(name => name.toLowerCase() === trimmedSearch.toLowerCase());

    return (
        <div>
            <Label htmlFor="tag-input">Tags</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        className="mt-1 h-auto min-h-9 w-full flex-wrap justify-start gap-1"
                        id="tag-input"
                        variant="outline"
                    >
                        {selected.length > 0
                            ? selected.map(name => <Badge key={name} variant="secondary">{name}</Badge>)
                            : <span className="font-normal text-muted-foreground">Add a tag</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search tags" value={search} onValueChange={setSearch} />
                        <CommandList>
                            <CommandEmpty>No tags found.</CommandEmpty>
                            <CommandGroup>
                                {availableTags.map(tag => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={() => toggleTag(tag.name)}
                                    >
                                        <span className={selected.includes(tag.name) ? "font-semibold" : undefined}>
                                            {tag.name}
                                        </span>
                                    </CommandItem>
                                ))}
                                {canCreate ? (
                                    <CommandItem
                                        value={`create:${trimmedSearch}`}
                                        onSelect={() => {
                                            setTags([...selected, trimmedSearch]);
                                            setSearch("");
                                        }}
                                    >
                                        Create &ldquo;{trimmedSearch}&rdquo;
                                    </CommandItem>
                                ) : null}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

/**
 * Custom excerpt textarea (Ember setCustomExcerpt): edits go into the
 * machine's excerpt scratch, blur validates and saves.
 */
function ExcerptField({ editor }: { editor: UseEditorResult }) {
    const { state, dispatch } = editor;
    const [error, setError] = useState<string | null>(null);

    const value = state.customExcerptScratch ?? "";

    const handleBlur = () => {
        if (state.customExcerptScratch === state.post?.customExcerpt) {
            return;
        }
        if (value.length > EXCERPT_MAX_LENGTH) {
            setError("Excerpt cannot be longer than 300 characters.");
            return;
        }
        setError(null);
        dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
    };

    return (
        <div>
            <Label htmlFor="custom-excerpt">Excerpt</Label>
            <Textarea
                className="mt-1"
                data-test-field="custom-excerpt"
                id="custom-excerpt"
                value={value}
                onBlur={handleBlur}
                onChange={event => dispatch({ type: "SCRATCH_CHANGED", field: "customExcerpt", value: event.target.value })}
            />
            <FieldError>{error}</FieldError>
        </div>
    );
}

/**
 * Feature image upload with preview + remove. Uses the framework uploader
 * directly (no Unsplash, consistent with the slice-1 deviation).
 */
function FeatureImageField({ editor }: { editor: UseEditorResult }) {
    const { state, dispatch } = editor;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { upload, isLoading, errors } = useKoenigFileUpload("image");

    const image = state.featureImageScratch;

    const setImage = (url: string | null) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "featureImage", value: url });
        // new posts defer the save until the post is created (Ember setCoverImage)
        if (state.post?.id) {
            dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }
        const results = await upload(files);
        event.target.value = "";
        const url = results?.[0]?.url;
        if (url) {
            setImage(url);
        }
    };

    return (
        <div>
            <Label htmlFor="feature-image">Feature image</Label>
            <input
                ref={fileInputRef}
                accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                className="hidden"
                data-testid="feature-image-file-input"
                id="feature-image"
                type="file"
                onChange={event => void handleFileChange(event)}
            />
            {image ? (
                <div className="mt-1">
                    <img alt="Feature" className="w-full rounded-md" src={image} />
                    <Button
                        className="mt-2"
                        data-testid="remove-feature-image"
                        variant="outline"
                        onClick={() => setImage(null)}
                    >
                        Remove
                    </Button>
                </div>
            ) : (
                <Button
                    className="mt-1 w-full"
                    data-testid="add-feature-image"
                    disabled={isLoading}
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isLoading ? "Uploading..." : "Add feature image"}
                </Button>
            )}
            {errors.map(uploadError => (
                <FieldError key={uploadError.fileName}>{uploadError.message}</FieldError>
            ))}
        </div>
    );
}

/** Delete button + confirmation dialog (Ember delete-post modal). */
function DeleteField({ editor, resource, noun }: {
    editor: UseEditorResult;
    resource: EditorResource;
    noun: string;
}) {
    const { mutateAsync: deletePost } = useDeletePost();
    const { mutateAsync: bulkDelete } = useBulkDeletePosts();
    const [error, setError] = useState<string | null>(null);

    const postId = editor.state.post?.id;

    const handleDelete = async () => {
        if (!postId) {
            return;
        }
        try {
            if (resource === "posts") {
                await deletePost(postId);
            } else {
                // the framework has no single-page delete; the bulk endpoint
                // with an id filter is equivalent
                await bulkDelete({ filter: `id:'${postId}'`, resource: "pages" });
            }
            // clear the machine so the leave guard doesn't block navigation
            // or try to save the deleted post (Ember's deleted-record case)
            editor.dispatch({ type: "RESET" });
            // location-based so a parked (flag-off) Ember list wakes up
            crossShellNavigate(`/${resource}`);
        } catch {
            setError(`Failed to delete ${noun.toLowerCase()}. Please try again.`);
        }
    };

    return (
        <div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="w-full text-red-600" data-test-button="delete-post" variant="outline">
                        Delete {noun.toLowerCase()}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this {noun.toLowerCase()}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You&rsquo;re about to delete this {noun.toLowerCase()}. This is permanent! We warned you, k?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-test-button="delete-post-confirm"
                            onClick={() => void handleDelete()}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <FieldError>{error}</FieldError>
        </div>
    );
}

export interface SettingsMenuProps {
    editor: UseEditorResult;
    resource: EditorResource;
}

/**
 * Post settings menu contents, rendered inside the editor's settings Sheet.
 * Port of the main pane of Ember's gh-post-settings-menu (subviews like meta
 * data / code injection are follow-ups).
 */
export function SettingsMenu({ editor, resource }: SettingsMenuProps) {
    const noun = resource === "pages" ? "Page" : "Post";

    if (!editor.state.post) {
        return null;
    }

    return (
        <div className="mt-6 flex flex-col gap-6">
            <PostUrlField editor={editor} noun={noun} />
            <PublishDateTimeFields editor={editor} />
            <TagsField editor={editor} />
            <ExcerptField editor={editor} />
            <FeatureImageField editor={editor} />
            {editor.state.post.id !== null ? (
                <DeleteField editor={editor} noun={noun} resource={resource} />
            ) : null}
        </div>
    );
}
