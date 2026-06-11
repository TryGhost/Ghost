import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorResource, FullPost } from "@tryghost/admin-x-framework/api/editor";
import { PublishFlowModal } from "./publish-flow-modal";
import type { PublishOptionsInput } from "./publish-options";

const mocks = vi.hoisted(() => ({
    navigate: vi.fn<(to: string) => void>(),
    input: vi.fn<() => PublishOptionsInput | null>(),
    recipientSelectData: vi.fn(() => ({
        stripeEnabled: true,
        segmentGroups: [] as Array<{ name: string; options: Array<{ name: string; segment: string }> }>,
    })),
}));

vi.mock("@/utils/cross-shell-navigate", () => ({
    crossShellNavigate: (to: string) => mocks.navigate(to),
}));

vi.mock("@tryghost/admin-x-framework", () => ({
}));

vi.mock("./use-publish-data", () => ({
    useSiteTimezone: () => "Etc/UTC",
    usePublishOptionsInput: () => mocks.input(),
    useRecipientSelectData: () => mocks.recipientSelectData(),
}));

function makeInput(overrides: Partial<PublishOptionsInput> = {}): PublishOptionsInput {
    return {
        post: {
            id: "post-1",
            isPage: false,
            status: "draft",
            visibility: "public",
            tierSlugs: [],
            hasEmail: false,
            emailStatus: null,
            newsletterSlug: null,
            emailSegment: null,
        },
        settings: {
            editorDefaultEmailRecipients: "visibility",
            editorDefaultEmailRecipientsFilter: null,
            membersSignupAccess: "all",
            defaultContentVisibility: "public",
            mailgunIsConfigured: true,
        },
        user: { isAdmin: true, isContributor: false },
        newsletters: [{
            id: "newsletter-1",
            slug: "default-newsletter",
            name: "Default newsletter",
            status: "active",
            sortOrder: 0,
        }],
        totalMemberCount: 5,
        emailDisabledError: null,
        ...overrides,
    };
}

const savedPost = { id: "post-1", email: null } as unknown as FullPost;

function setup({
    input = makeInput(),
    resource = "posts" as EditorResource,
    performSave = vi.fn<() => Promise<FullPost>>().mockResolvedValue(savedPost),
    onClose = vi.fn(),
} = {}) {
    mocks.input.mockReturnValue(input);
    render(
        <PublishFlowModal
            performSave={performSave}
            post={{ id: "post-1" } as FullPost}
            resource={resource}
            onClose={onClose}
        />,
    );
    return { performSave, onClose };
}

function query(selector: string): HTMLElement | null {
    return document.querySelector(selector);
}

function expectElement(selector: string): HTMLElement {
    const element = query(selector);
    expect(element, selector).not.toBeNull();
    return element as HTMLElement;
}

async function goToConfirm() {
    fireEvent.click(expectElement('[data-test-button="continue"]'));
    await screen.findByText("Back to settings");
}

describe("PublishFlowModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("renders the options step with publish type, recipients and schedule settings", () => {
        setup();

        expect(expectElement('[data-test-modal="publish-flow"]')).toBeInTheDocument();
        expect(expectElement('[data-test-publish-flow="options"]')).toBeInTheDocument();
        expect(expectElement('[data-test-setting="publish-type"]')).toHaveTextContent("Publish and email");
        expect(expectElement('[data-test-setting="email-recipients"]')).toBeInTheDocument();
        expect(expectElement('[data-test-setting="publish-at"]')).toHaveTextContent("Right now");
        expect(expectElement('[data-test-button="continue"]')).toBeInTheDocument();
    });

    it("hides membership features when email is unavailable", () => {
        setup({
            input: makeInput({
                settings: {
                    ...makeInput().settings,
                    membersSignupAccess: "none",
                },
            }),
        });

        const publishType = expectElement('[data-test-setting="publish-type"]');
        expect(publishType).toHaveTextContent("Publish on site");
        expect(publishType.querySelector("button")).toBeNull();
        expect(query('[data-test-setting="email-recipients"]')).toBeNull();
    });

    it("closes via the close button", () => {
        const { onClose } = setup();

        fireEvent.click(expectElement('[data-test-button="close-publish-flow"]'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("publishes and emails with newsletter + segment params, then leaves for the posts list", async () => {
        const { performSave } = setup();

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

        await waitFor(() => {
            expect(performSave).toHaveBeenCalledWith({
                saveType: "publish",
                publishedAt: undefined,
                emailOnly: false,
                newsletter: "default-newsletter",
                emailSegment: "status:free,status:-free",
            });
        });
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/posts");
        });
        expect(JSON.parse(localStorage.getItem("ghost-last-published-post") ?? "null"))
            .toEqual({ id: "post-1", type: "post" });
    });

    it("navigates to analytics when the published post has an email", async () => {
        const emailedPost = { id: "post-1", email: { email_count: 1, opened_count: 0 } } as unknown as FullPost;
        const { performSave } = setup({
            performSave: vi.fn<() => Promise<FullPost>>().mockResolvedValue(emailedPost),
        });

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

        await waitFor(() => {
            expect(performSave).toHaveBeenCalled();
        });
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/posts/analytics/post-1");
        });
    });

    it("sends email-only posts with emailOnly true", async () => {
        const { performSave } = setup();

        fireEvent.click(expectElement('[data-test-setting="publish-type"] [data-test-setting-title]'));
        fireEvent.click(expectElement('[data-test-publish-type="send"]'));
        expect(expectElement('[data-test-setting="publish-type"]')).toHaveTextContent("Email");

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

        await waitFor(() => {
            expect(performSave).toHaveBeenCalledWith(expect.objectContaining({
                saveType: "publish",
                emailOnly: true,
                newsletter: "default-newsletter",
            }));
        });
    });

    it("greys out the email recipients when publish only is selected", () => {
        setup();

        fireEvent.click(expectElement('[data-test-setting="publish-type"] [data-test-setting-title]'));
        fireEvent.click(expectElement('[data-test-publish-type="publish"]'));

        expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Not sent as newsletter");
    });

    describe("email recipients selector", () => {
        function openRecipients() {
            fireEvent.click(expectElement('[data-test-setting="email-recipients"] [data-test-setting-title]'));
        }

        it("narrows the send to paid subscribers and persists it as the email segment", async () => {
            const { performSave } = setup();

            openRecipients();
            // default 'all' = free + paid checked
            expect(expectElement('[data-test-checkbox="free-members"]')).toBeChecked();
            expect(expectElement('[data-test-checkbox="paid-members"]')).toBeChecked();

            fireEvent.click(expectElement('[data-test-checkbox="free-members"]'));

            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Paid subscribers");

            await goToConfirm();
            fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

            await waitFor(() => {
                expect(performSave).toHaveBeenCalledWith(expect.objectContaining({
                    emailSegment: "status:-free",
                }));
            });
        });

        it("treats an empty selection as not sending the newsletter", () => {
            setup();

            openRecipients();
            fireEvent.click(expectElement('[data-test-checkbox="free-members"]'));
            fireEvent.click(expectElement('[data-test-checkbox="paid-members"]'));

            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Not sent as newsletter");
        });

        it("hides the paid toggle when Stripe is not enabled", () => {
            mocks.recipientSelectData.mockReturnValue({ stripeEnabled: false, segmentGroups: [] });
            setup();

            openRecipients();

            expect(expectElement('[data-test-checkbox="free-members"]')).toBeInTheDocument();
            expect(query('[data-test-checkbox="paid-members"]')).toBeNull();
            expect(query('[data-test-checkbox="specific-members"]')).toBeNull();
        });

        it("selects specific label/tier segments and persists them as the email segment", async () => {
            mocks.recipientSelectData.mockReturnValue({
                stripeEnabled: true,
                segmentGroups: [
                    { name: "Labels", options: [{ name: "VIP", segment: "label:vip" }] },
                    { name: "Active tiers", options: [{ name: "Gold", segment: "tier:gold" }] },
                ],
            });
            const { performSave } = setup();

            openRecipients();
            // drop the base toggles so only the specific segment remains
            fireEvent.click(expectElement('[data-test-checkbox="free-members"]'));
            fireEvent.click(expectElement('[data-test-checkbox="paid-members"]'));
            fireEvent.click(expectElement('[data-test-checkbox="specific-members"]'));
            expect(expectElement('[data-test-select="specific-members"]')).toBeInTheDocument();

            fireEvent.click(expectElement('[data-test-segment="label:vip"]'));

            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Specific subscribers");

            await goToConfirm();
            fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

            await waitFor(() => {
                expect(performSave).toHaveBeenCalledWith(expect.objectContaining({
                    emailSegment: "label:vip",
                }));
            });
        });

        it("keeps the base toggles alongside specific segments in the email segment (Ember reports 'all')", async () => {
            mocks.recipientSelectData.mockReturnValue({
                stripeEnabled: true,
                segmentGroups: [{ name: "Labels", options: [{ name: "VIP", segment: "label:vip" }] }],
            });
            const { performSave } = setup();

            openRecipients();
            fireEvent.click(expectElement('[data-test-checkbox="specific-members"]'));
            fireEvent.click(expectElement('[data-test-segment="label:vip"]'));

            // free + paid + a segment still summarizes as "all" (Ember recipientType)
            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("All subscribers");

            await goToConfirm();
            fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

            await waitFor(() => {
                expect(performSave).toHaveBeenCalledWith(expect.objectContaining({
                    emailSegment: "status:free,status:-free,label:vip",
                }));
            });
        });

        it("restores the previous specific selection when toggling specific people off and on", () => {
            mocks.recipientSelectData.mockReturnValue({
                stripeEnabled: true,
                segmentGroups: [{ name: "Labels", options: [{ name: "VIP", segment: "label:vip" }] }],
            });
            setup();

            openRecipients();
            fireEvent.click(expectElement('[data-test-checkbox="free-members"]'));
            fireEvent.click(expectElement('[data-test-checkbox="paid-members"]'));
            fireEvent.click(expectElement('[data-test-checkbox="specific-members"]'));
            fireEvent.click(expectElement('[data-test-segment="label:vip"]'));
            expect(expectElement('[data-test-checkbox="specific-members"]')).toBeChecked();
            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Specific subscribers");

            // off: the segment is removed from the filter
            fireEvent.click(expectElement('[data-test-checkbox="specific-members"]'));
            expect(query('[data-test-select="specific-members"]')).toBeNull();
            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Not sent as newsletter");

            // on: the stored selection is restored
            fireEvent.click(expectElement('[data-test-checkbox="specific-members"]'));
            expect(expectElement('[data-test-setting="email-recipients"]')).toHaveTextContent("Specific subscribers");
        });
    });

    it("schedules with a published_at timestamp and leaves with the scheduled storage key", async () => {
        const { performSave } = setup();

        const publishAt = expectElement('[data-test-setting="publish-at"]');
        fireEvent.click(publishAt.querySelector("button") as HTMLElement);
        fireEvent.click(screen.getByText("Schedule for later"));

        // the summary switches from "Right now" to a relative time
        expect(publishAt.querySelector('[data-test-setting-title]')).not.toHaveTextContent("Right now");

        const dateInput = expectElement("[data-test-date-time-picker-date-input]") as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: "2050-01-01" } });
        fireEvent.blur(dateInput);

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

        await waitFor(() => {
            expect(performSave).toHaveBeenCalledWith(expect.objectContaining({
                saveType: "schedule",
                publishedAt: expect.stringMatching(/^2050-01-01T/) as string,
            }));
        });
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/posts");
        });
        expect(JSON.parse(localStorage.getItem("ghost-last-scheduled-post") ?? "null"))
            .toEqual({ id: "post-1", type: "post" });
    });

    it("navigates to the pages list for pages", async () => {
        setup({
            input: makeInput({ post: { ...makeInput().post, isPage: true } }),
            resource: "pages",
        });

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith("/pages");
        });
        expect(JSON.parse(localStorage.getItem("ghost-last-published-post") ?? "null"))
            .toEqual({ id: "post-1", type: "page" });
    });

    it("shows the save error and stays on the confirm step when saving fails", async () => {
        const { performSave } = setup({
            performSave: vi.fn<() => Promise<FullPost>>().mockRejectedValue(new Error("Saving failed!")),
        });

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="confirm-publish"]'));
        await act(async () => {
            await Promise.resolve();
        });

        expect(performSave).toHaveBeenCalledTimes(1);
        expect(expectElement("[data-test-confirm-error]")).toHaveTextContent("Saving failed!");
        expect(expectElement('[data-test-button="confirm-publish"]')).not.toBeDisabled();
        expect(mocks.navigate).not.toHaveBeenCalled();
    });

    it("returns to the options step via back to settings", async () => {
        setup();

        await goToConfirm();
        fireEvent.click(expectElement('[data-test-button="back-to-options"]'));

        expect(expectElement('[data-test-publish-flow="options"]')).toBeInTheDocument();
    });

    it("shows a loading state until the publish data is ready", () => {
        setup({ input: null as unknown as PublishOptionsInput });

        expect(screen.getByText("Loading...")).toBeInTheDocument();
        expect(query('[data-test-button="continue"]')).toBeNull();
    });
});
