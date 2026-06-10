import { useMemo, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useKoenigFileUpload } from "@tryghost/admin-x-framework";
import { CodeEditor, type CodeEditorProps } from "@tryghost/admin-x-design-system";
import { crossShellNavigate } from "@/utils/cross-shell-navigate";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import type { EditorResource } from "@tryghost/admin-x-framework/api/editor";
import { useBulkDeletePosts, useDeletePost } from "@tryghost/admin-x-framework/api/posts";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseTags } from "@tryghost/admin-x-framework/api/tags";
import { useActiveTheme } from "@tryghost/admin-x-framework/api/themes";
import { useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { isAuthorOrContributor, isContributorUser, useBrowseUsers } from "@tryghost/admin-x-framework/api/users";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from "@tryghost/shade/components";
import type { NamedRef, PostSettings } from "@/editor/state";
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

/**
 * Commit PSM settings into the machine scratch and save immediately for
 * existing posts; new posts defer the save until the post is created
 * (Ember's per-field `savePostTask` pattern in gh-post-settings-menu).
 */
function commitSettings(editor: UseEditorResult, settings: Partial<PostSettings>, { save = true } = {}) {
    editor.dispatch({ type: "SETTINGS_CHANGED", settings });
    if (save && editor.state.post?.id) {
        editor.dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
    }
}

/** Ember gh-count-down-characters: used-character count, red when over. */
function CharCountdown({ max, value }: { max: number; value: string }) {
    const count = value.length;
    return (
        <p className="mt-1 text-sm text-gray-600">
            Recommended: <b>{max}</b> characters. You&rsquo;ve used{" "}
            <span className={count > max ? "font-semibold text-red-600" : "font-semibold text-green-600"}>{count}</span>
        </p>
    );
}

/**
 * Generic multi-select combobox (same pattern as TagsField) used by the
 * tiers and authors selects — fixed option list, no creation.
 */
function MultiSelectField({ id, label, placeholder, searchPlaceholder, emptyText, options, selected, testId, onChange }: {
    id: string;
    label: string;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
    options: NamedRef[];
    selected: NamedRef[];
    testId: string;
    onChange: (next: NamedRef[]) => void;
}) {
    const [open, setOpen] = useState(false);

    const toggle = (option: NamedRef) => {
        const isSelected = selected.some(ref => ref.id === option.id);
        onChange(isSelected ? selected.filter(ref => ref.id !== option.id) : [...selected, option]);
    };

    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        className="mt-1 h-auto min-h-9 w-full flex-wrap justify-start gap-1"
                        data-testid={testId}
                        id={id}
                        variant="outline"
                    >
                        {selected.length > 0
                            ? selected.map(ref => <Badge key={ref.id} variant="secondary">{ref.name}</Badge>)
                            : <span className="font-normal text-muted-foreground">{placeholder}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {options.map(option => (
                                    <CommandItem
                                        key={option.id}
                                        value={option.name}
                                        onSelect={() => toggle(option)}
                                    >
                                        <span className={selected.some(ref => ref.id === option.id) ? "font-semibold" : undefined}>
                                            {option.name}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Ember gh-psm-visibility-input VISIBILITIES (+ the tiers option)
const VISIBILITIES = [
    { label: "Public", value: "public" },
    { label: "Members only", value: "members" },
    { label: "Paid-members only", value: "paid" },
    { label: "Specific tier(s)", value: "tiers" },
];

/**
 * Post access select + tier multi-select (Ember gh-psm-visibility-input +
 * visibility-segment-select). Unset visibility shows the site's default
 * content visibility; selecting a non-tiers option clears the tiers.
 */
function VisibilityField({ editor, noun }: { editor: UseEditorResult; noun: string }) {
    const { state } = editor;
    const { data: settingsData } = useBrowseSettings();
    const defaultVisibility = getSettingValue<string>(settingsData?.settings, "default_content_visibility") ?? "public";
    const visibility = state.settingsScratch.visibility ?? defaultVisibility;

    // Ember visibility-segment-select: paid tiers only (active + archived)
    const { data: tiersData } = useBrowseTiers({ searchParams: { filter: "type:paid", limit: "all" } });
    const tierOptions = (tiersData?.tiers ?? []).map(({ id, name }) => ({ id, name }));

    const updateVisibility = (value: string) => {
        commitSettings(editor, {
            visibility: value,
            ...(value !== "tiers" ? { tiers: [] } : {}),
            // switching INTO 'tiers' defers the save until a tier is picked
            // (the API rejects visibility 'tiers' without tiers)
        }, { save: value !== "tiers" });
    };

    const updateTiers = (tiers: NamedRef[]) => {
        commitSettings(editor, { tiers }, { save: tiers.length > 0 });
    };

    const tiersSelected = visibility === "tiers";
    // the API returns every tier for public/members posts; like Ember's
    // visibility-segment-select `selectedOptions`, only show (and edit) the
    // intersection with the selectable paid tiers
    const selectedTiers = state.settingsScratch.tiers.filter(tier => (
        tierOptions.some(option => option.id === tier.id)
    ));

    return (
        <div data-testid="psm-visibility">
            <Label htmlFor="visibility-input">{noun} access</Label>
            <Select value={visibility} onValueChange={updateVisibility}>
                <SelectTrigger className="mt-1" data-test-select="post-visibility" id="visibility-input">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {VISIBILITIES.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {tiersSelected ? (
                <div className="mt-3" data-test-visibility-segment-select>
                    <MultiSelectField
                        emptyText="No tiers found."
                        id="tiers-input"
                        label="Tiers"
                        options={tierOptions}
                        placeholder="Select tiers"
                        searchPlaceholder="Search tiers"
                        selected={selectedTiers}
                        testId="psm-tiers"
                        onChange={updateTiers}
                    />
                    {selectedTiers.length === 0 ? (
                        <FieldError>Please select at least one tier</FieldError>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/**
 * Authors multi-select (Ember gh-psm-authors-input). New unsaved posts show
 * the current user (the server assigns the creating user on create).
 */
function AuthorsField({ editor }: { editor: UseEditorResult }) {
    const { state } = editor;
    const { data: usersData } = useBrowseUsers({ searchParams: { limit: "all", include: "roles" } });
    const { data: currentUser } = useCurrentUser();
    const [error, setError] = useState<string | null>(null);

    const options = (usersData?.users ?? []).map(({ id, name }) => ({ id, name }));
    const scratch = state.settingsScratch.authors;
    // new posts have no authors yet — the creating user becomes the author
    const selected = scratch.length === 0 && state.post?.id === null && currentUser
        ? [{ id: currentUser.id, name: currentUser.name }]
        : scratch;

    const updateAuthors = (authors: NamedRef[]) => {
        if (authors.length === 0) {
            setError("At least one author is required.");
            return;
        }
        setError(null);
        commitSettings(editor, { authors });
    };

    return (
        <div data-testid="psm-authors">
            <MultiSelectField
                emptyText="No staff users found."
                id="author-list"
                label="Authors"
                options={options}
                placeholder="Select authors"
                searchPlaceholder="Search staff users"
                selected={selected}
                testId="psm-authors-input"
                onChange={updateAuthors}
            />
            <FieldError>{error}</FieldError>
        </div>
    );
}

// Radix Select items can't have an empty value; the default template
// (filename '') is mapped onto this sentinel
const DEFAULT_TEMPLATE = "__default__";

/**
 * Custom template select (Ember gh-psm-template-select). Only rendered when
 * the active theme has custom templates; like Ember, changing the template
 * does NOT save immediately — it rides along with the next save.
 */
function TemplateField({ editor, resource }: { editor: UseEditorResult; resource: EditorResource }) {
    const { state } = editor;
    const { data: themesData } = useActiveTheme();

    const templates = themesData?.themes?.[0]?.templates ?? [];
    const customTemplates = templates
        .filter(template => !template.slug)
        .sort((a, b) => (a.name ?? a.filename).localeCompare(b.name ?? b.filename));

    if (customTemplates.length === 0) {
        return null;
    }

    // a slug-bound template (custom-about.hbs) overrides the dropdown
    const type = resource === "pages" ? "page" : "post";
    const matchedSlugTemplate = templates.find(template => (
        Boolean(template.slug) && template.slug === state.slugScratch && (template.for ?? []).includes(type)
    ));

    const value = state.settingsScratch.customTemplate || DEFAULT_TEMPLATE;

    const updateTemplate = (selectedValue: string) => {
        // template changes don't auto-save in Ember either — the machine is
        // dirty until the next (auto/manual/leave) save carries the change
        commitSettings(editor, {
            customTemplate: selectedValue === DEFAULT_TEMPLATE ? "" : selectedValue,
        }, { save: false });
    };

    return (
        <div data-test-custom-template-form data-testid="psm-template">
            <Label htmlFor="template-select">Template</Label>
            <Select disabled={Boolean(matchedSlugTemplate)} value={value} onValueChange={updateTemplate}>
                <SelectTrigger className="mt-1" data-test-select="custom-template" id="template-select">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={DEFAULT_TEMPLATE}>Default</SelectItem>
                    {customTemplates.map(template => (
                        <SelectItem key={template.filename} value={template.filename}>
                            {template.name ?? template.filename}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {matchedSlugTemplate ? (
                <p className="mt-1 text-sm text-gray-600">{noun(resource)} URL matches {matchedSlugTemplate.filename}</p>
            ) : null}
        </div>
    );
}

function noun(resource: EditorResource): string {
    return resource === "pages" ? "Page" : "Post";
}

/** Switch row used by the featured / show-title-and-feature-image toggles. */
function ToggleField({ id, label, checked, testCheckbox, onChange }: {
    id: string;
    label: string;
    checked: boolean;
    testCheckbox: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <Label className="cursor-pointer" htmlFor={id}>{label}</Label>
            <Switch checked={checked} data-test-checkbox={testCheckbox} id={id} onCheckedChange={onChange} />
        </div>
    );
}

type StringSettingsKey =
    | "canonicalUrl"
    | "metaTitle"
    | "metaDescription"
    | "ogTitle"
    | "ogDescription"
    | "twitterTitle"
    | "twitterDescription";

/**
 * Shared scratch-edit + blur-save text field for the meta data / social card
 * subview fields (Ember's setMetaTitle & co: validate on blur, save existing
 * posts, defer for new posts).
 */
function SettingsTextField({ editor, field, label, id, testId, placeholder, multiline, maxLength, maxLengthError, validate, hint }: {
    editor: UseEditorResult;
    field: StringSettingsKey;
    label: string;
    id: string;
    testId: string;
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
    maxLengthError?: string;
    validate?: (value: string) => string | null;
    hint?: ReactNode;
}) {
    const { state, dispatch } = editor;
    const [error, setError] = useState<string | null>(null);

    const value = state.settingsScratch[field] ?? "";

    const handleChange = (nextValue: string) => {
        dispatch({ type: "SETTINGS_CHANGED", settings: { [field]: nextValue || null } });
    };

    const handleBlur = () => {
        if (state.settingsScratch[field] === state.post?.settings[field]) {
            return;
        }
        if (maxLength !== undefined && value.length > maxLength) {
            setError(maxLengthError ?? `Cannot be longer than ${maxLength} characters.`);
            return;
        }
        const validationError = validate?.(value) ?? null;
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        if (state.post?.id) {
            dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
        }
    };

    const inputProps = {
        className: "mt-1",
        "data-test-field": testId,
        id,
        placeholder,
        value,
    };

    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            {multiline ? (
                <Textarea
                    {...inputProps}
                    onBlur={handleBlur}
                    onChange={event => handleChange(event.target.value)}
                />
            ) : (
                <Input
                    {...inputProps}
                    onBlur={handleBlur}
                    onChange={event => handleChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                        }
                    }}
                />
            )}
            {hint}
            <FieldError>{error}</FieldError>
        </div>
    );
}

/**
 * Social card image upload (og/twitter image), same uploader pattern as the
 * feature image field.
 */
function SettingsImageField({ editor, field, label, addText, testIdPrefix }: {
    editor: UseEditorResult;
    field: "ogImage" | "twitterImage";
    label: string;
    addText: string;
    testIdPrefix: string;
}) {
    const { state } = editor;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { upload, isLoading, errors } = useKoenigFileUpload("image");

    const image = state.settingsScratch[field];

    const setImage = (url: string | null) => {
        commitSettings(editor, { [field]: url });
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
            <Label htmlFor={`${testIdPrefix}-input`}>{label}</Label>
            <input
                ref={fileInputRef}
                accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                className="hidden"
                data-testid={`${testIdPrefix}-file-input`}
                id={`${testIdPrefix}-input`}
                type="file"
                onChange={event => void handleFileChange(event)}
            />
            {image ? (
                <div className="mt-1">
                    <img alt={label} className="w-full rounded-md" src={image} />
                    <Button
                        className="mt-2"
                        data-testid={`remove-${testIdPrefix}`}
                        variant="outline"
                        onClick={() => setImage(null)}
                    >
                        Remove
                    </Button>
                </div>
            ) : (
                <Button
                    className="mt-1 w-full"
                    data-testid={`add-${testIdPrefix}`}
                    disabled={isLoading}
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isLoading ? "Uploading..." : addText}
                </Button>
            )}
            {errors.map(uploadError => (
                <FieldError key={uploadError.fileName}>{uploadError.message}</FieldError>
            ))}
        </div>
    );
}

/**
 * Code injection editor (Ember GhCmEditor): commit per keystroke into the
 * machine scratch, save on blur. CodeMirror's HTML language pack is loaded
 * on demand and CodeEditor itself is React.lazy, so CodeMirror stays out of
 * the main bundle until the section is opened (same pattern as the tag
 * details code-injection section in apps/posts).
 */
function CodeInjectionField({ editor, field, label, code, testId, htmlExtensions }: {
    editor: UseEditorResult;
    field: "codeinjectionHead" | "codeinjectionFoot";
    label: string;
    code: string;
    testId: string;
    htmlExtensions: CodeEditorProps["extensions"];
}) {
    const { state, dispatch } = editor;

    const handleBlur = () => {
        if (state.settingsScratch[field] === state.post?.settings[field]) {
            return;
        }
        if (state.post?.id) {
            dispatch({ type: "SAVE_REQUESTED", kind: "manual" });
        }
    };

    return (
        <div>
            <Label>{label} <code className="ml-1 font-mono text-xs font-normal text-gray-600">{code}</code></Label>
            <div className="mt-1">
                <CodeEditor
                    data-testid={testId}
                    extensions={htmlExtensions}
                    value={state.settingsScratch[field] ?? ""}
                    onBlur={handleBlur}
                    onChange={value => dispatch({ type: "SETTINGS_CHANGED", settings: { [field]: value || null } })}
                />
            </div>
        </div>
    );
}

// Ember validators/post.js canonicalUrl
function validateCanonicalUrl(value: string): string | null {
    if (!value) {
        return null;
    }
    if (/\s/.test(value) || !/^(\/|[a-zA-Z0-9-]+:)/.test(value)) {
        return "Please enter a valid URL";
    }
    if (value.length > 2000) {
        return "Canonical URL is too long, max 2000 chars";
    }
    return null;
}

/**
 * The Meta data / X card / Facebook card / Code injection subviews. Ember
 * renders these as slide-in sub-panes; here they're collapsible sections in
 * the same column (same approved pattern as the tag details screen).
 */
function SubviewSections({ editor, resource }: { editor: UseEditorResult; resource: EditorResource }) {
    const { state } = editor;
    const htmlExtensions = useMemo(() => [import("@codemirror/lang-html").then(module => module.html())], []);

    // Ember's placeholder fallback chains (without the site-settings tails)
    const seoTitle = state.settingsScratch.metaTitle || state.titleScratch || "(Untitled)";
    const seoDescription = state.settingsScratch.metaDescription || state.customExcerptScratch || "";
    const facebookTitle = state.settingsScratch.ogTitle || seoTitle;
    const facebookDescription = state.settingsScratch.ogDescription || seoDescription;
    const twitterTitle = state.settingsScratch.twitterTitle || seoTitle;
    const twitterDescription = state.settingsScratch.twitterDescription || seoDescription;

    const displayNoun = noun(resource);

    return (
        <Accordion className="border-t border-[#E6E9EB]" type="multiple">
            <AccordionItem value="codeinjection">
                <AccordionTrigger data-test-button="codeinjection" data-testid="psm-code-injection">
                    Code injection
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-5 p-1">
                        <CodeInjectionField
                            code="{{ghost_head}}"
                            editor={editor}
                            field="codeinjectionHead"
                            htmlExtensions={htmlExtensions}
                            label={`${displayNoun} header`}
                            testId="codeinjection-head-editor"
                        />
                        <CodeInjectionField
                            code="{{ghost_foot}}"
                            editor={editor}
                            field="codeinjectionFoot"
                            htmlExtensions={htmlExtensions}
                            label={`${displayNoun} footer`}
                            testId="codeinjection-foot-editor"
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="meta-data">
                <AccordionTrigger data-test-button="meta-data" data-testid="psm-meta-data">
                    Meta data
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-5 p-1">
                        <SettingsTextField
                            editor={editor}
                            field="metaTitle"
                            hint={<CharCountdown max={60} value={state.settingsScratch.metaTitle ?? ""} />}
                            id="meta-title"
                            label="Meta title"
                            maxLength={300}
                            maxLengthError="Meta Title cannot be longer than 300 characters."
                            placeholder={seoTitle}
                            testId="meta-title"
                        />
                        <SettingsTextField
                            multiline
                            editor={editor}
                            field="metaDescription"
                            hint={<CharCountdown max={145} value={state.settingsScratch.metaDescription ?? ""} />}
                            id="meta-description"
                            label="Meta description"
                            maxLength={500}
                            maxLengthError="Meta Description cannot be longer than 500 characters."
                            placeholder={seoDescription}
                            testId="meta-description"
                        />
                        <SettingsTextField
                            editor={editor}
                            field="canonicalUrl"
                            id="canonicalUrl"
                            label="Canonical URL"
                            testId="canonicalUrl"
                            validate={validateCanonicalUrl}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="twitter-data">
                <AccordionTrigger data-test-button="twitter-data" data-testid="psm-x-card">
                    X card
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-5 p-1">
                        <SettingsImageField
                            addText="Add X image"
                            editor={editor}
                            field="twitterImage"
                            label="X image"
                            testIdPrefix="twitter-image"
                        />
                        <SettingsTextField
                            editor={editor}
                            field="twitterTitle"
                            id="twitter-title"
                            label="X title"
                            maxLength={300}
                            maxLengthError="Twitter Title cannot be longer than 300 characters."
                            placeholder={twitterTitle}
                            testId="twitter-title"
                        />
                        <SettingsTextField
                            multiline
                            editor={editor}
                            field="twitterDescription"
                            id="twitter-description"
                            label="X description"
                            maxLength={500}
                            maxLengthError="Twitter Description cannot be longer than 500 characters."
                            placeholder={twitterDescription}
                            testId="twitter-description"
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="facebook-data">
                <AccordionTrigger data-test-button="facebook-data" data-testid="psm-facebook-card">
                    Facebook card
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-5 p-1">
                        <SettingsImageField
                            addText="Add Facebook image"
                            editor={editor}
                            field="ogImage"
                            label="Facebook image"
                            testIdPrefix="og-image"
                        />
                        <SettingsTextField
                            editor={editor}
                            field="ogTitle"
                            id="og-title"
                            label="Facebook title"
                            maxLength={300}
                            maxLengthError="Facebook Title cannot be longer than 300 characters."
                            placeholder={facebookTitle}
                            testId="og-title"
                        />
                        <SettingsTextField
                            multiline
                            editor={editor}
                            field="ogDescription"
                            id="og-description"
                            label="Facebook description"
                            maxLength={500}
                            maxLengthError="Facebook Description cannot be longer than 500 characters."
                            placeholder={facebookDescription}
                            testId="og-description"
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

export interface SettingsMenuProps {
    editor: UseEditorResult;
    resource: EditorResource;
}

/**
 * Post settings menu contents, rendered inside the editor's settings Sheet.
 * Port of Ember's gh-post-settings-menu: the main pane fields in Ember's
 * order, with the meta data / social card / code injection sub-panes as
 * collapsible sections.
 */
export function SettingsMenu({ editor, resource }: SettingsMenuProps) {
    const displayNoun = noun(resource);
    const post = editor.state.post;

    // Ember role gates: tags hidden for contributors; access (visibility),
    // authors and the featured toggle hidden for authors + contributors
    const { data: currentUser } = useCurrentUser();
    const isContributor = currentUser ? isContributorUser(currentUser) : false;
    const showStaffFields = currentUser ? !isAuthorOrContributor(currentUser) : false;

    if (!post) {
        return null;
    }

    return (
        <div className="flex flex-col gap-5 [&_label]:text-[1.3rem] [&_label]:font-medium [&_label]:text-[#15171A]">
            <PostUrlField editor={editor} noun={displayNoun} />
            <PublishDateTimeFields editor={editor} />
            {!isContributor ? <TagsField editor={editor} /> : null}
            {showStaffFields ? <VisibilityField editor={editor} noun={displayNoun} /> : null}
            <ExcerptField editor={editor} />
            {showStaffFields ? <AuthorsField editor={editor} /> : null}
            <TemplateField editor={editor} resource={resource} />
            <FeatureImageField editor={editor} />
            <div className="flex flex-col gap-4" data-testid="psm-toggles">
                {resource === "pages" && post.lexical !== null ? (
                    <ToggleField
                        checked={editor.state.settingsScratch.showTitleAndFeatureImage ?? true}
                        id="show-title-and-feature-image"
                        label="Show title and feature image"
                        testCheckbox="hide-title-and-feature-image"
                        onChange={checked => commitSettings(editor, { showTitleAndFeatureImage: checked })}
                    />
                ) : null}
                {showStaffFields ? (
                    <ToggleField
                        checked={editor.state.settingsScratch.featured}
                        id="featured"
                        label={`Feature this ${displayNoun.toLowerCase()}`}
                        testCheckbox="featured"
                        onChange={checked => commitSettings(editor, { featured: checked })}
                    />
                ) : null}
            </div>
            <SubviewSections editor={editor} resource={resource} />
            {post.id !== null ? (
                <DeleteField editor={editor} noun={displayNoun} resource={resource} />
            ) : null}
        </div>
    );
}
