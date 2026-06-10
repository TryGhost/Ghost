import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { type ManualSaveOptions } from "@/editor/use-editor";
import { crossShellNavigate } from "@/utils/cross-shell-navigate";
import {
    createPublishOptions,
    getActiveNewsletters,
    getPublishSaveDetails,
    getPublishTypeOptions,
    getRecipientFilter,
    getRecipientType,
    getSelectedNewsletter,
    getSelectedPublishTypeOption,
    isEmailUnavailable,
    onlyDefaultNewsletter,
    setNewsletter,
    setPublishType,
    setScheduledAt,
    toggleScheduled,
    willEmail,
    willPublish,
    type PublishOptionsInput,
    type PublishOptionsState,
    type PublishSaveDetails,
} from "./publish-options";
import {
    formatDateInTimezone,
    formatDayInTimezone,
    formatMonthDayInTimezone,
    formatRelative,
    formatTimeInTimezone,
    zonedDateTimeToUtc,
} from "./schedule-time";
import { usePublishOptionsInput, useSiteTimezone } from "./use-publish-data";

type UpdateOptions = (updater: (state: PublishOptionsState) => PublishOptionsState) => void;

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function SettingArrow({ expanded }: { expanded: boolean }) {
    return (
        <span aria-hidden="true" className={`text-xs text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
            &#9662;
        </span>
    );
}

function ScheduleDateTimePicker({ options, updateOptions, timezone }: {
    options: PublishOptionsState;
    updateOptions: UpdateOptions;
    timezone: string;
}) {
    const dateValue = formatDateInTimezone(options.scheduledAtUTC, timezone);
    const timeValue = formatTimeInTimezone(options.scheduledAtUTC, timezone);

    const [dateDraft, setDateDraft] = useState(dateValue);
    const [timeDraft, setTimeDraft] = useState(timeValue);

    // resync the drafts whenever the committed value changes (e.g. clamping)
    useEffect(() => {
        setDateDraft(dateValue);
    }, [dateValue]);
    useEffect(() => {
        setTimeDraft(timeValue);
    }, [timeValue]);

    const commit = (dateStr: string, timeStr: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim()) || !/^\d{1,2}:\d{2}$/.test(timeStr.trim())) {
            setDateDraft(dateValue);
            setTimeDraft(timeValue);
            return;
        }
        updateOptions(state => setScheduledAt(state, zonedDateTimeToUtc(dateStr.trim(), timeStr.trim(), timezone)));
    };

    return (
        <div className="mt-3 flex gap-2">
            <input
                className="w-36 rounded border border-gray-300 px-3 py-1.5 text-sm"
                data-test-date-time-picker-date-input
                placeholder="YYYY-MM-DD"
                value={dateDraft}
                onBlur={() => commit(dateDraft, timeDraft)}
                onChange={event => setDateDraft(event.target.value)}
            />
            <input
                className="w-24 rounded border border-gray-300 px-3 py-1.5 text-sm"
                data-test-date-time-picker-time-input
                placeholder="HH:MM"
                value={timeDraft}
                onBlur={() => commit(dateDraft, timeDraft)}
                onChange={event => setTimeDraft(event.target.value)}
            />
        </div>
    );
}

function RadioDot({ active }: { active: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block size-4 shrink-0 rounded-full border ${active ? "border-[5px] border-green-600" : "border-gray-300"}`}
        />
    );
}

type Section = "publishType" | "emailRecipients" | "publishAt" | null;

function OptionsStep({ input, options, updateOptions, timezone, onContinue }: {
    input: PublishOptionsInput;
    options: PublishOptionsState;
    updateOptions: UpdateOptions;
    timezone: string;
    onContinue: () => void;
}) {
    const [openSection, setOpenSection] = useState<Section>(null);
    const toggleSection = (section: Exclude<Section, null>) => {
        setOpenSection(current => (current === section ? null : section));
    };

    const emailUnavailable = isEmailUnavailable(input);
    const selectedType = getSelectedPublishTypeOption(input, options);
    const recipientFilter = getRecipientFilter(input, options);
    const recipientType = getRecipientType(recipientFilter);
    const newsletters = getActiveNewsletters(input);
    const selectedNewsletter = getSelectedNewsletter(input, options);

    const recipientSummary = recipientFilter
        ? `${capitalize(recipientType)} subscribers${onlyDefaultNewsletter(input) || !selectedNewsletter ? "" : ` of ${selectedNewsletter.name}`}`
        : "Not sent as newsletter";

    const settingTitleClass = "flex w-full items-center justify-between gap-2 py-1 text-left text-[1.5rem] font-semibold";

    return (
        <div data-test-publish-flow="options">
            <div className="mb-8 text-2xl font-bold">
                <div className="text-green-600">Ready, set, publish.</div>
                <div>Share it with the world.</div>
            </div>

            <div className="divide-y divide-gray-200 border-y border-gray-200">
                <div className="py-4" data-test-setting="publish-type">
                    {emailUnavailable ? (
                        <div className={settingTitleClass} data-test-setting-title>Publish on site</div>
                    ) : (
                        <>
                            <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("publishType")}>
                                <span>{selectedType.display}</span>
                                <SettingArrow expanded={openSection === "publishType"} />
                            </button>
                            {openSection === "publishType" ? (
                                <fieldset className="mt-3 flex flex-col gap-2">
                                    {getPublishTypeOptions(input).map(option => (
                                        <span key={option.value} className="flex items-center gap-2">
                                            <input
                                                checked={option.value === options.publishType}
                                                className="sr-only"
                                                data-test-publish-type={option.value}
                                                disabled={option.disabled}
                                                id={`publish-type-${option.value}`}
                                                name="publish-type"
                                                type="radio"
                                                value={option.value}
                                                onChange={() => updateOptions(state => setPublishType(state, option.value))}
                                            />
                                            <RadioDot active={option.value === options.publishType} />
                                            <label
                                                className={option.disabled ? "text-gray-400" : "cursor-pointer"}
                                                htmlFor={`publish-type-${option.value}`}
                                            >
                                                {option.label}
                                            </label>
                                        </span>
                                    ))}
                                </fieldset>
                            ) : null}
                        </>
                    )}
                </div>

                {!emailUnavailable ? (
                    <div className="py-4" data-test-setting="email-recipients">
                        {options.publishType === "publish" ? (
                            <div className={`${settingTitleClass} text-gray-400`} data-test-setting-title>
                                Not sent as newsletter
                            </div>
                        ) : (
                            <>
                                <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("emailRecipients")}>
                                    <span>{recipientSummary}</span>
                                    <SettingArrow expanded={openSection === "emailRecipients"} />
                                </button>
                                {openSection === "emailRecipients" ? (
                                    <div className="mt-3 flex flex-col gap-3 text-sm">
                                        {newsletters.length > 1 ? (
                                            <div className="flex flex-col gap-1" data-test-select="newsletter">
                                                <label className="text-xs font-semibold text-gray-500 uppercase" htmlFor="publish-newsletter-select">
                                                    Newsletter
                                                </label>
                                                <select
                                                    className="rounded border border-gray-300 px-2 py-1.5"
                                                    id="publish-newsletter-select"
                                                    value={selectedNewsletter?.id ?? ""}
                                                    onChange={event => updateOptions(state => setNewsletter(state, event.target.value))}
                                                >
                                                    {newsletters.map(newsletter => (
                                                        <option key={newsletter.id} value={newsletter.id}>{newsletter.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : null}
                                        <p className="text-gray-600">
                                            This {input.post.isPage ? "page" : "post"} will be sent to
                                            {" "}{recipientType === "all" ? "all" : recipientType} subscribers
                                            {selectedNewsletter ? ` of ${selectedNewsletter.name}` : ""}.
                                        </p>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                ) : null}

                <div className="py-4" data-test-setting="publish-at">
                    <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("publishAt")}>
                        <span>
                            {options.isScheduled ? capitalize(formatRelative(options.scheduledAtUTC)) : "Right now"}
                        </span>
                        <SettingArrow expanded={openSection === "publishAt"} />
                    </button>
                    {openSection === "publishAt" ? (
                        <div className="mt-3">
                            <div className="flex gap-6">
                                <div
                                    className="flex cursor-pointer items-center gap-2"
                                    onClick={() => updateOptions(state => toggleScheduled(state, false))}
                                >
                                    <span data-test-radio="publish-now"><RadioDot active={!options.isScheduled} /></span>
                                    <label className="cursor-pointer">Set it live now</label>
                                </div>
                                <div
                                    className="flex cursor-pointer items-center gap-2"
                                    onClick={() => updateOptions(state => toggleScheduled(state, true))}
                                >
                                    <span data-test-radio="schedule"><RadioDot active={options.isScheduled} /></span>
                                    <label className="cursor-pointer">Schedule for later</label>
                                </div>
                            </div>
                            {options.isScheduled ? (
                                <ScheduleDateTimePicker options={options} timezone={timezone} updateOptions={updateOptions} />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-8">
                <Button className="w-full" data-test-button="continue" size="lg" onClick={onContinue}>
                    Continue, final review &rarr;
                </Button>
            </div>
        </div>
    );
}

const BUTTON_TEXT_MAP = {
    "publish+send": { idle: "Publish & send", running: "Publishing & sending" },
    send: { idle: "Send email", running: "Sending" },
    publish: { idle: "Publish", running: "Publishing" },
} as const;

function ConfirmStep({ input, options, timezone, saving, error, onConfirm, onBack }: {
    input: PublishOptionsInput;
    options: PublishOptionsState;
    timezone: string;
    saving: boolean;
    error: string | null;
    onConfirm: () => void;
    onBack: () => void;
}) {
    const emailing = willEmail(input, options);
    const publishing = willPublish(options);
    const noun = input.post.isPage ? "page" : "post";
    const recipientType = getRecipientType(getRecipientFilter(input, options));
    const newsletter = getSelectedNewsletter(input, options);

    // Ember publish-flow/confirm.js confirmButtonText
    const textKey = publishing && emailing ? "publish+send" : (emailing ? "send" : "publish");
    let confirmText: string = BUTTON_TEXT_MAP[textKey].idle;
    if (textKey === "publish") {
        confirmText += ` ${noun}`;
    }
    confirmText += options.isScheduled
        ? `, on ${formatMonthDayInTimezone(options.scheduledAtUTC, timezone)}`
        : ", right now";

    const runningText = options.isScheduled ? "Scheduling" : BUTTON_TEXT_MAP[textKey].running;

    return (
        <div data-test-publish-flow="confirm">
            <div className="mb-8 text-2xl font-bold">
                <div className="text-green-600">Ready, set, publish.</div>
                <div>Share it with the world.</div>
            </div>

            <p className="text-lg text-gray-700" data-test-text="confirm-details">
                {options.isScheduled ? (
                    <>
                        On <strong>{formatDayInTimezone(options.scheduledAtUTC, timezone)}</strong> at{" "}
                        <strong>{formatTimeInTimezone(options.scheduledAtUTC, timezone)}</strong> your{" "}
                    </>
                ) : "Your "}
                {noun}
                {publishing ? <> will be published on your site{emailing ? "," : "."}</> : null}
                {emailing ? (
                    <>
                        {" "}will be delivered to{" "}
                        <strong>{recipientType === "all" ? "all" : recipientType} subscribers</strong>
                        {newsletter && !onlyDefaultNewsletter(input) ? <> of <strong>{newsletter.name}</strong></> : null}
                        {publishing ? "." : ", and will not be published on your site."}
                    </>
                ) : null}
            </p>

            {error ? (
                <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-test-confirm-error>
                    {error}
                </p>
            ) : null}

            <div className="mt-8 flex flex-col items-center gap-3">
                <Button className="w-full" data-test-button="confirm-publish" disabled={saving} size="lg" onClick={onConfirm}>
                    {saving ? runningText : confirmText}
                </Button>
                <button className="text-sm text-gray-600 hover:text-black" data-test-button="back-to-options" type="button" onClick={onBack}>
                    Back to settings
                </button>
            </div>
        </div>
    );
}

/**
 * The publish flow (Ember's editor/modals/publish-flow): a full-screen
 * overlay with an options step and a confirm step. On success it mirrors
 * Ember's `setCompleted`: write the ghost-last-published/scheduled-post
 * localStorage key and leave for the posts/pages list (or post analytics for
 * emailed posts) where the post-success modal takes over.
 */
export function PublishFlowModal({ post, resource, performSave, onClose }: {
    post: FullPost;
    resource: EditorResource;
    performSave: (options: ManualSaveOptions) => Promise<FullPost>;
    onClose: () => void;
}) {
    const input = usePublishOptionsInput(post, resource);
    const timezone = useSiteTimezone();

    const [options, setOptions] = useState<PublishOptionsState | null>(null);
    const [step, setStep] = useState<"options" | "confirm">("options");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // initialize selections once all input data has loaded
    useEffect(() => {
        if (input && !options) {
            setOptions(createPublishOptions(input));
        }
    }, [input, options]);

    const updateOptions: UpdateOptions = (updater) => {
        setOptions(current => (current ? updater(current) : current));
    };

    const completeAndLeave = (saved: FullPost, details: PublishSaveDetails) => {
        const type = resource === "pages" ? "page" : "post";
        const storageKey = details.saveType === "schedule" ? "ghost-last-scheduled-post" : "ghost-last-published-post";
        try {
            localStorage.setItem(storageKey, JSON.stringify({ id: saved.id, type }));
        } catch {
            // ignore localStorage errors (Ember does the same)
        }

        // location-based so the hidden Ember app wakes when the target list
        // is Ember-owned (its labs flag off) — router pushState would leave
        // the parked Ember app showing nothing
        if (resource === "pages") {
            crossShellNavigate("/pages");
        } else if (details.saveType !== "schedule" && saved.email) {
            crossShellNavigate(`/posts/analytics/${saved.id}`);
        } else {
            crossShellNavigate("/posts");
        }
    };

    const handleConfirm = async () => {
        if (!input || !options || saving) {
            return;
        }

        const details = getPublishSaveDetails(input, options);

        setSaving(true);
        setError(null);
        try {
            const saved = await performSave({
                saveType: details.saveType,
                publishedAt: details.publishedAt,
                emailOnly: details.emailOnly,
                newsletter: details.newsletter,
                emailSegment: details.emailSegment,
            });
            completeAndLeave(saved, details);
        } catch (saveError) {
            setSaving(false);
            setError(saveError instanceof Error && saveError.message ? saveError.message : "Unknown Error");
        }
    };

    return createPortal(
        <div className="shade shade-admin fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white" data-test-modal="publish-flow">
            <header className="flex shrink-0 items-center justify-between px-6 py-4">
                <h2 className="text-lg font-bold">Publish</h2>
                <Button data-test-button="close-publish-flow" variant="outline" onClick={onClose}>
                    Close
                </Button>
            </header>

            <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-10">
                {!input || !options ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : step === "confirm" ? (
                    <ConfirmStep
                        error={error}
                        input={input}
                        options={options}
                        saving={saving}
                        timezone={timezone}
                        onBack={() => setStep("options")}
                        onConfirm={() => void handleConfirm()}
                    />
                ) : (
                    <OptionsStep
                        input={input}
                        options={options}
                        timezone={timezone}
                        updateOptions={updateOptions}
                        onContinue={() => setStep("confirm")}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
}
