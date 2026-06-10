import { describe, expect, it } from "vitest";
import {
    createPublishOptions,
    defaultScheduledAt,
    getActiveNewsletters,
    getDefaultRecipientFilter,
    getFullRecipientFilter,
    getPublishSaveDetails,
    getPublishTypeOptions,
    getRecipientFilter,
    getRecipientType,
    getSelectedNewsletter,
    getVisibilitySegment,
    isEmailDisabled,
    isEmailUnavailable,
    minScheduledAt,
    resetPastScheduledAt,
    setPublishType,
    setRecipientFilter,
    setScheduledAt,
    toggleScheduled,
    validatePost,
    willEmail,
    willOnlyEmail,
    willPublish,
    type PublishOptionsInput,
    type PublishOptionsNewsletter,
    type PublishOptionsPost,
    type PublishOptionsSettings,
} from "./publish-options";

const NOW = new Date("2026-06-09T12:00:00.000Z");

function makePost(overrides: Partial<PublishOptionsPost> = {}): PublishOptionsPost {
    return {
        id: "post-1",
        isPage: false,
        status: "draft",
        visibility: "public",
        tierSlugs: [],
        hasEmail: false,
        emailStatus: null,
        newsletterSlug: null,
        emailSegment: null,
        ...overrides,
    };
}

function makeSettings(overrides: Partial<PublishOptionsSettings> = {}): PublishOptionsSettings {
    return {
        editorDefaultEmailRecipients: "visibility",
        editorDefaultEmailRecipientsFilter: null,
        membersSignupAccess: "all",
        defaultContentVisibility: "public",
        mailgunIsConfigured: true,
        ...overrides,
    };
}

function makeNewsletter(overrides: Partial<PublishOptionsNewsletter> = {}): PublishOptionsNewsletter {
    return {
        id: "newsletter-1",
        slug: "default-newsletter",
        name: "Default newsletter",
        status: "active",
        sortOrder: 0,
        ...overrides,
    };
}

function makeInput(overrides: Partial<PublishOptionsInput> = {}): PublishOptionsInput {
    return {
        post: makePost(),
        settings: makeSettings(),
        user: { isAdmin: true, isContributor: false },
        newsletters: [makeNewsletter()],
        totalMemberCount: 5,
        emailDisabledError: null,
        ...overrides,
    };
}

describe("publish-options", () => {
    describe("createPublishOptions", () => {
        it("defaults to publish+send when email is available", () => {
            const state = createPublishOptions(makeInput(), NOW);

            expect(state.publishType).toBe("publish+send");
            expect(state.isScheduled).toBe(false);
            expect(state.newsletterId).toBe("newsletter-1");
            expect(state.selectedRecipientFilter).toBeUndefined();
        });

        it("falls back to publish when there are no members", () => {
            const state = createPublishOptions(makeInput({ totalMemberCount: 0 }), NOW);
            expect(state.publishType).toBe("publish");
        });

        it("falls back to publish when mailgun is not configured", () => {
            const input = makeInput({ settings: makeSettings({ mailgunIsConfigured: false }) });
            expect(createPublishOptions(input, NOW).publishType).toBe("publish");
        });

        it("falls back to publish when email is unavailable for pages", () => {
            const input = makeInput({ post: makePost({ isPage: true }) });
            expect(createPublishOptions(input, NOW).publishType).toBe("publish");
        });

        it('falls back to publish when default recipients is "usually nobody"', () => {
            const input = makeInput({
                settings: makeSettings({
                    editorDefaultEmailRecipients: "filter",
                    editorDefaultEmailRecipientsFilter: null,
                }),
            });
            expect(createPublishOptions(input, NOW).publishType).toBe("publish");
        });

        it("defaults to send for sent posts", () => {
            const input = makeInput({ post: makePost({ status: "sent", hasEmail: true }) });
            expect(createPublishOptions(input, NOW).publishType).toBe("send");
        });

        it("selects the first active newsletter by sort order", () => {
            const input = makeInput({
                newsletters: [
                    makeNewsletter({ id: "n-archived", sortOrder: 0, status: "archived" }),
                    makeNewsletter({ id: "n-second", sortOrder: 2 }),
                    makeNewsletter({ id: "n-first", sortOrder: 1 }),
                ],
            });
            expect(createPublishOptions(input, NOW).newsletterId).toBe("n-first");
        });
    });

    describe("email availability", () => {
        it("is unavailable for pages, posts with an email and disabled email settings", () => {
            expect(isEmailUnavailable(makeInput())).toBe(false);
            expect(isEmailUnavailable(makeInput({ post: makePost({ isPage: true }) }))).toBe(true);
            expect(isEmailUnavailable(makeInput({ post: makePost({ hasEmail: true, emailStatus: "submitted" }) }))).toBe(true);
            expect(isEmailUnavailable(makeInput({
                settings: makeSettings({ editorDefaultEmailRecipients: "disabled" }),
            }))).toBe(true);
            expect(isEmailUnavailable(makeInput({
                settings: makeSettings({ membersSignupAccess: "none" }),
            }))).toBe(true);
        });

        it("is disabled without mailgun, members or with a sending error", () => {
            expect(isEmailDisabled(makeInput())).toBe(false);
            expect(isEmailDisabled(makeInput({ totalMemberCount: 0 }))).toBe(true);
            expect(isEmailDisabled(makeInput({ settings: makeSettings({ mailgunIsConfigured: false }) }))).toBe(true);
            expect(isEmailDisabled(makeInput({ emailDisabledError: "sending disabled" }))).toBe(true);
        });

        it("disables the email options in the publish type list", () => {
            const options = getPublishTypeOptions(makeInput({ totalMemberCount: 0 }));
            expect(options.map(option => [option.value, option.disabled ?? false])).toEqual([
                ["publish+send", true],
                ["publish", false],
                ["send", true],
            ]);
        });
    });

    describe("recipient filters", () => {
        it("derives the default filter from post visibility", () => {
            expect(getDefaultRecipientFilter(makeInput())).toBe("status:free,status:-free");
            expect(getDefaultRecipientFilter(makeInput({ post: makePost({ visibility: "members" }) })))
                .toBe("status:free,status:-free");
            expect(getDefaultRecipientFilter(makeInput({ post: makePost({ visibility: "paid" }) })))
                .toBe("status:-free");
            expect(getDefaultRecipientFilter(makeInput({
                post: makePost({ visibility: "tiers", tierSlugs: ["silver", "gold"] }),
            }))).toBe("tier:silver,tier:gold");
        });

        it("uses the settings filter when default recipients is filter-based", () => {
            const input = makeInput({
                settings: makeSettings({
                    editorDefaultEmailRecipients: "filter",
                    editorDefaultEmailRecipientsFilter: "status:-free",
                }),
            });
            expect(getDefaultRecipientFilter(input)).toBe("status:-free");
        });

        it("returns null when emailing is disabled in settings", () => {
            const input = makeInput({ settings: makeSettings({ editorDefaultEmailRecipients: "disabled" }) });
            expect(getDefaultRecipientFilter(input)).toBeNull();
        });

        it("prefers an explicit selection, including selecting nobody", () => {
            const input = makeInput();
            const state = createPublishOptions(input, NOW);

            expect(getRecipientFilter(input, state)).toBe("status:free,status:-free");
            expect(getRecipientFilter(input, setRecipientFilter(state, "status:-free"))).toBe("status:-free");
            expect(getRecipientFilter(input, setRecipientFilter(state, null))).toBeNull();
        });

        it("falls back to the post's saved segment when it was sent with a newsletter", () => {
            const input = makeInput({
                post: makePost({ newsletterSlug: "default-newsletter", emailSegment: "status:-free" }),
            });
            const state = createPublishOptions(input, NOW);
            expect(getRecipientFilter(input, state)).toBe("status:-free");
        });

        it("classifies recipient types", () => {
            expect(getRecipientType(null)).toBe("none");
            expect(getRecipientType("status:free")).toBe("free");
            expect(getRecipientType("status:-free")).toBe("paid");
            expect(getRecipientType("status:free,status:-free")).toBe("all");
            expect(getRecipientType("tier:gold")).toBe("specific");
        });

        it("builds the full recipient filter from the newsletter audience", () => {
            const input = makeInput();
            const state = createPublishOptions(input, NOW);

            expect(getFullRecipientFilter(input, state))
                .toBe("newsletters.slug:default-newsletter+email_disabled:0+(status:free,status:-free)");
        });

        it("computes visibility segments like the Ember post model", () => {
            expect(getVisibilitySegment(makePost(), makeSettings())).toBe("status:free,status:-free");
            expect(getVisibilitySegment(makePost(), makeSettings({ defaultContentVisibility: "paid" })))
                .toBe("status:-free");
            expect(getVisibilitySegment(makePost({ visibility: "paid" }), makeSettings())).toBe("status:-free");
        });
    });

    describe("will email/publish", () => {
        it("emails for publish+send and send drafts with recipients", () => {
            const input = makeInput();
            const state = createPublishOptions(input, NOW);

            expect(willEmail(input, state)).toBe(true);
            expect(willEmail(input, setPublishType(state, "send"))).toBe(true);
            expect(willEmail(input, setPublishType(state, "publish"))).toBe(false);
            expect(willEmail(input, setRecipientFilter(state, null))).toBe(false);
        });

        it("does not email published posts but retries failed emails", () => {
            const published = makeInput({ post: makePost({ status: "published" }) });
            expect(willEmail(published, createPublishOptions(published, NOW))).toBe(false);

            const failed = makeInput({ post: makePost({ hasEmail: true, emailStatus: "failed" }) });
            expect(willEmail(failed, createPublishOptions(failed, NOW))).toBe(true);
        });

        it("derives willPublish/willOnlyEmail from the publish type", () => {
            const state = createPublishOptions(makeInput(), NOW);

            expect(willPublish(state)).toBe(true);
            expect(willOnlyEmail(state)).toBe(false);
            expect(willPublish(setPublishType(state, "send"))).toBe(false);
            expect(willOnlyEmail(setPublishType(state, "send"))).toBe(true);
        });
    });

    describe("scheduling", () => {
        it("computes min and default schedule times", () => {
            expect(minScheduledAt(NOW).toISOString()).toBe("2026-06-09T12:00:05.000Z");
            expect(defaultScheduledAt(NOW).toISOString()).toBe("2026-06-09T12:10:00.000Z");
        });

        it("toggling on moves the time to the default when unset or too close", () => {
            const state = createPublishOptions(makeInput(), NOW);
            const scheduled = toggleScheduled(state, true, NOW);

            expect(scheduled.isScheduled).toBe(true);
            expect(scheduled.scheduledAtUTC.toISOString()).toBe("2026-06-09T12:10:00.000Z");
        });

        it("toggling on keeps an already-selected future time", () => {
            const state = setScheduledAt(createPublishOptions(makeInput(), NOW), new Date("2050-01-01T10:00:00.000Z"), NOW);
            const scheduled = toggleScheduled(state, true, NOW);

            expect(scheduled.scheduledAtUTC.toISOString()).toBe("2050-01-01T10:00:00.000Z");
        });

        it("clamps past schedule times to the minimum", () => {
            const state = createPublishOptions(makeInput(), NOW);
            const clamped = setScheduledAt(state, new Date("2020-01-01T00:00:00.000Z"), NOW);

            expect(clamped.scheduledAtUTC.toISOString()).toBe(minScheduledAt(NOW).toISOString());
        });

        it("truncates milliseconds (the API only stores seconds)", () => {
            const state = setScheduledAt(createPublishOptions(makeInput(), NOW), new Date("2050-01-01T10:00:00.123Z"), NOW);
            expect(state.scheduledAtUTC.getUTCMilliseconds()).toBe(0);
        });

        it("unschedules when the selected time is in the past", () => {
            const state = toggleScheduled(createPublishOptions(makeInput(), NOW), true, NOW);
            const later = new Date(NOW.getTime() + 60 * 60 * 1000);

            expect(resetPastScheduledAt(state, NOW).isScheduled).toBe(true);
            expect(resetPastScheduledAt(state, later).isScheduled).toBe(false);
        });
    });

    describe("getPublishSaveDetails", () => {
        it("publish only: no email params and no published_at", () => {
            const input = makeInput();
            const state = setPublishType(createPublishOptions(input, NOW), "publish");

            expect(getPublishSaveDetails(input, state)).toEqual({ saveType: "publish" });
        });

        it("publish and email: newsletter + segment params, emailOnly false", () => {
            const input = makeInput();
            const state = createPublishOptions(input, NOW);

            expect(getPublishSaveDetails(input, state)).toEqual({
                saveType: "publish",
                emailOnly: false,
                newsletter: "default-newsletter",
                emailSegment: "status:free,status:-free",
            });
        });

        it("email only: emailOnly true", () => {
            const input = makeInput();
            const state = setPublishType(createPublishOptions(input, NOW), "send");

            expect(getPublishSaveDetails(input, state)).toMatchObject({
                saveType: "publish",
                emailOnly: true,
                newsletter: "default-newsletter",
            });
        });

        it("scheduling: saveType schedule with the published_at timestamp", () => {
            const input = makeInput();
            let state = setPublishType(createPublishOptions(input, NOW), "publish");
            state = toggleScheduled(state, true, NOW);
            state = setScheduledAt(state, new Date("2050-01-01T10:00:00.000Z"), NOW);

            expect(getPublishSaveDetails(input, state)).toEqual({
                saveType: "schedule",
                publishedAt: "2050-01-01T10:00:00.000Z",
            });
        });
    });

    describe("helpers", () => {
        it("filters and sorts active newsletters", () => {
            const input = makeInput({
                newsletters: [
                    makeNewsletter({ id: "b", sortOrder: 1 }),
                    makeNewsletter({ id: "archived", status: "archived" }),
                    makeNewsletter({ id: "a", sortOrder: 0 }),
                ],
            });

            expect(getActiveNewsletters(input).map(newsletter => newsletter.id)).toEqual(["a", "b"]);
            expect(getSelectedNewsletter(input, createPublishOptions(input, NOW))?.id).toBe("a");
        });

        it("validates the title length", () => {
            expect(validatePost({ title: "Fine" })).toBeNull();
            expect(validatePost({ title: "x".repeat(256) })).toMatch(/255 characters/);
        });
    });
});
