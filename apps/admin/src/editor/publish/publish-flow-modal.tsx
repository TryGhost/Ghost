import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
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
        <LucideIcon.ChevronDown
            aria-hidden="true"
            className={`ml-auto size-4 shrink-0 text-[#9DA8B4] transition-transform ${expanded ? "-scale-y-100" : ""}`}
        />
    );
}

/** Pill-styled radio label (Ember .gh-publish-types/.gh-publish-schedule labels). */
function pillClass({ active, disabled }: { active: boolean; disabled?: boolean }): string {
    const base = "block h-[38px] whitespace-nowrap rounded-full text-[1.4rem] font-medium tracking-[.2px]";
    if (active) {
        return `${base} cursor-pointer border-2 border-[#15171A] bg-[#FAFAFB] px-[17px] leading-[34px] text-[#15171A]`;
    }
    if (disabled) {
        return `${base} cursor-default border border-[#DEE3E7] px-[18px] leading-[36px] text-[#ABB4BE]`;
    }
    return `${base} cursor-pointer border border-[#DEE3E7] px-[18px] leading-[36px] text-[#54666D] hover:text-[#394047]`;
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
        // invalid formats AND impossible calendar dates (Feb 30) reset the
        // inputs to the committed value
        const scheduledAt = /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim()) && /^\d{1,2}:\d{2}$/.test(timeStr.trim())
            ? zonedDateTimeToUtc(dateStr.trim(), timeStr.trim(), timezone)
            : null;
        if (!scheduledAt) {
            setDateDraft(dateValue);
            setTimeDraft(timeValue);
            return;
        }
        updateOptions(state => setScheduledAt(state, scheduledAt));
    };

    return (
        <div className="flex gap-3">
            <input
                className="h-[38px] w-[150px] rounded-md border border-[#DEE3E7] bg-white px-3 text-[1.4rem] text-[#15171A] outline-none focus:border-[#15171A]"
                data-test-date-time-picker-date-input
                placeholder="YYYY-MM-DD"
                value={dateDraft}
                onBlur={() => commit(dateDraft, timeDraft)}
                onChange={event => setDateDraft(event.target.value)}
            />
            <input
                className="h-[38px] w-[110px] rounded-md border border-[#DEE3E7] bg-white px-3 text-[1.4rem] text-[#15171A] outline-none focus:border-[#15171A]"
                data-test-date-time-picker-time-input
                placeholder="HH:MM"
                value={timeDraft}
                onBlur={() => commit(dateDraft, timeDraft)}
                onChange={event => setTimeDraft(event.target.value)}
            />
        </div>
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

    const settingTitleClass = "flex w-full items-center pb-4 text-left text-[1.8rem] font-normal leading-[1.35] text-[#15171A]";
    const settingIconClass = "mr-3.5 size-[1.65rem] shrink-0";

    return (
        <div data-test-publish-flow="options">
            <div className="mb-10 text-[4.6rem] leading-[1.2] font-bold tracking-[-0.017em]">
                <div className="text-[#30CF43]">Ready, set, publish.</div>
                <div className="text-[#15171A]">Share it with the world.</div>
            </div>

            <div className="mt-4 mb-[5.2rem] w-full">
                <div className="mb-4 border-b border-[#E6E9EB]" data-test-setting="publish-type">
                    {emailUnavailable ? (
                        <div className={settingTitleClass} data-test-setting-title>
                            <LucideIcon.Send aria-hidden="true" className={settingIconClass} />
                            Publish on site
                        </div>
                    ) : (
                        <>
                            <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("publishType")}>
                                <LucideIcon.Send aria-hidden="true" className={settingIconClass} />
                                <span>{selectedType.display}</span>
                                <SettingArrow expanded={openSection === "publishType"} />
                            </button>
                            {openSection === "publishType" ? (
                                <fieldset className="mb-4 flex gap-3 pt-1 pb-6">
                                    {getPublishTypeOptions(input).map(option => (
                                        <span key={option.value}>
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
                                            <label
                                                className={pillClass({ active: option.value === options.publishType, disabled: option.disabled })}
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
                    <div className="mb-4 border-b border-[#E6E9EB]" data-test-setting="email-recipients">
                        {options.publishType === "publish" ? (
                            <div className={`${settingTitleClass} text-[#ABB4BE]`} data-test-setting-title>
                                <LucideIcon.User aria-hidden="true" className={settingIconClass} />
                                Not sent as newsletter
                            </div>
                        ) : (
                            <>
                                <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("emailRecipients")}>
                                    <LucideIcon.User aria-hidden="true" className={settingIconClass} />
                                    <span>{recipientSummary}</span>
                                    <SettingArrow expanded={openSection === "emailRecipients"} />
                                </button>
                                {openSection === "emailRecipients" ? (
                                    <div className="mb-4 flex flex-col gap-3 pt-1 pb-6 text-[1.4rem]">
                                        {newsletters.length > 1 ? (
                                            <div className="flex flex-col gap-1" data-test-select="newsletter">
                                                <label className="text-[1.2rem] font-semibold tracking-wide text-[#7C8B9A] uppercase" htmlFor="publish-newsletter-select">
                                                    Newsletter
                                                </label>
                                                <select
                                                    className="h-[38px] rounded-md border border-[#DEE3E7] bg-white px-3 text-[1.4rem] text-[#15171A]"
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
                                        <p className="text-[#54666D]">
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

                <div data-test-setting="publish-at">
                    <button className={settingTitleClass} data-test-setting-title type="button" onClick={() => toggleSection("publishAt")}>
                        <LucideIcon.Clock aria-hidden="true" className={settingIconClass} />
                        <span>
                            {options.isScheduled ? capitalize(formatRelative(options.scheduledAtUTC)) : "Right now"}
                        </span>
                        <SettingArrow expanded={openSection === "publishAt"} />
                    </button>
                    {openSection === "publishAt" ? (
                        <div className="mb-4 flex flex-wrap items-center gap-3 pt-1 pb-6">
                            <div onClick={() => updateOptions(state => toggleScheduled(state, false))}>
                                <span data-test-radio="publish-now">
                                    <label className={pillClass({ active: !options.isScheduled })}>Set it live now</label>
                                </span>
                            </div>
                            <div onClick={() => updateOptions(state => toggleScheduled(state, true))}>
                                <span data-test-radio="schedule">
                                    <label className={pillClass({ active: options.isScheduled })}>Schedule for later</label>
                                </span>
                            </div>
                            {options.isScheduled ? (
                                <ScheduleDateTimePicker options={options} timezone={timezone} updateOptions={updateOptions} />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div>
                <Button
                    className="h-10 rounded-md bg-[#15171A] px-5 text-[1.4rem] font-medium text-white hover:bg-black"
                    data-test-button="continue"
                    onClick={onContinue}
                >
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
            <div className="mb-10 text-[4.6rem] leading-[1.2] font-bold tracking-[-0.017em]">
                <div className="text-[#30CF43]">Ready, set, publish.</div>
                <div className="text-[#15171A]">Share it with the world.</div>
            </div>

            <p className="text-[1.8rem] leading-[1.6] font-normal text-[#15171A]" data-test-text="confirm-details">
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
                <p className="mt-4 rounded-sm border border-red-200 bg-red-50 px-5 py-4 text-[1.45rem] text-red-700" data-test-confirm-error>
                    {error}
                </p>
            ) : null}

            <div className="mt-[5rem] flex w-max items-center gap-8">
                <Button
                    className="h-10 rounded-md bg-gradient-to-r from-[#4DD831] to-[#1DC32E] px-5 text-[1.4rem] font-medium text-white hover:from-[#4DD831] hover:to-[#1DC32E] hover:opacity-90"
                    data-test-button="confirm-publish"
                    disabled={saving}
                    onClick={onConfirm}
                >
                    {saving ? runningText : confirmText}
                </Button>
                <button className="text-[1.45rem] text-[#7C8B9A]" data-test-button="back-to-options" type="button" onClick={onBack}>
                    <span className="text-[#394047] hover:text-[#15171A]">Back to settings</span>
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
            <header className="mx-5 my-3 flex h-[34px] shrink-0 items-center justify-between">
                <h2 className="text-[1.7rem] font-bold tracking-[-0.01em] text-[#15171A]">Publish</h2>
                <Button
                    className="h-[34px] px-3 text-[1.35rem] text-[#394047] hover:bg-[#F4F5F6]"
                    data-test-button="close-publish-flow"
                    variant="ghost"
                    onClick={onClose}
                >
                    Close
                </Button>
            </header>

            <div className="mx-auto flex w-full max-w-[688px] flex-1 flex-col px-6 pt-[11vw] pb-[11vw]">
                {!input || !options ? (
                    <div className="text-[1.4rem] text-[#54666D]">Loading...</div>
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
